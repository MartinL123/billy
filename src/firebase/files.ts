import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  increment,
  setDoc,
  sum,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { accountDoc, newId, send, userCol, userDoc } from './paths'
import type { FileKind, StoredFile } from './types'
import { joinBytes, MAX_PDF_SIZE, splitBytes } from '../lib/chunks'
import { MAX_IMAGE_BYTES } from '../lib/image'
import { fits, FULL_MESSAGE } from '../lib/usage'

// Espace utilisé par le compte (users/{uid}.usage.bytes), tenu à jour par le store : sert à refuser un ajout
// quand les 80 Mo sont pleins, même hors ligne. Le texte reste toujours possible.
let knownUsage = 0
export const setKnownUsage = (bytes: number) => {
  knownUsage = bytes
}

function track(delta: number): void {
  knownUsage += delta
  send(setDoc(accountDoc(), { usage: { bytes: increment(delta) } }, { merge: true }))
}

/** Recalcule l’espace à partir des fichiers enregistrés (comptes d’avant le compteur, ou pour corriger). */
export function setUsage(bytes: number): void {
  knownUsage = bytes
  send(setDoc(accountDoc(), { usage: { bytes } }, { merge: true }))
}

/** Quota gratuit du plan Spark. */
export const QUOTA_BYTES = 1024 * 1024 * 1024

const chunksCol = (fileId: string) => collection(userDoc('files', fileId), 'chunks')

/** Enregistre une image déjà compressée (< 900 Ko) dans son propre document : une photo, ou une page de document. */
export async function saveImage(blob: Blob, kind: FileKind = 'photo'): Promise<string> {
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('Image trop lourde')
  if (!fits(knownUsage, blob.size)) throw new Error(FULL_MESSAGE)
  const id = newId('files')
  const data = Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer()))
  const file: StoredFile = { mimeType: blob.type || 'image/jpeg', size: blob.size, data, kind }
  send(setDoc(userDoc('files', id), file))
  track(blob.size)
  return id
}

/** Enregistre un PDF (toujours un document) découpé en morceaux de 750 Ko. */
export function savePdf(bytes: Uint8Array): string {
  if (bytes.length > MAX_PDF_SIZE) throw new Error('PDF trop lourd')
  if (!fits(knownUsage, bytes.length)) throw new Error(FULL_MESSAGE)
  const id = newId('files')
  const parts = splitBytes(bytes)
  parts.forEach((part, n) => send(setDoc(doc(chunksCol(id), String(n)), { data: Bytes.fromUint8Array(part) })))
  const file: StoredFile = { mimeType: 'application/pdf', size: bytes.length, chunkCount: parts.length, kind: 'document' }
  send(setDoc(userDoc('files', id), file))
  track(bytes.length)
  return id
}

// Les fichiers ne changent jamais : le cache local d’abord, le serveur seulement s’il manque.
async function getFileDoc(id: string): Promise<DocumentSnapshot> {
  const ref = userDoc('files', id)
  try {
    return await getDocFromCache(ref)
  } catch {
    return getDoc(ref)
  }
}

async function loadChunks(id: string, chunkCount: number): Promise<Uint8Array[]> {
  let snap = await getDocsFromCache(chunksCol(id))
  if (snap.size !== chunkCount) snap = await getDocs(chunksCol(id))
  if (snap.size !== chunkCount) throw new Error('Fichier incomplet')
  return snap.docs
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((d) => (d.data().data as Bytes).toUint8Array())
}

export async function loadFile(id: string): Promise<Blob> {
  const snap = await getFileDoc(id)
  if (!snap.exists()) throw new Error('Fichier introuvable')
  const file = snap.data() as StoredFile
  const bytes = file.chunkCount ? joinBytes(await loadChunks(id, file.chunkCount)) : file.data?.toUint8Array()
  if (!bytes) throw new Error('Fichier vide')
  return new Blob([bytes as BlobPart], { type: file.mimeType })
}

export function deleteFile(id: string | undefined): void {
  if (!id) return
  const ref = userDoc('files', id)
  getFileDoc(id)
    .then((snap) => {
      const count = snap.exists() ? ((snap.data() as StoredFile).chunkCount ?? 0) : 0
      if (snap.exists()) track(-((snap.data() as StoredFile).size ?? 0))
      for (let n = 0; n < count; n++) send(deleteDoc(doc(chunksCol(id), String(n))))
    })
    .catch(() => undefined)
    .finally(() => send(deleteDoc(ref)))
}

/** Espace utilisé par les fichiers, calculé par le serveur (une lecture facturée par tranche de 1 000 fichiers). */
export async function storageUsed(): Promise<number> {
  const snap = await getAggregateFromServer(userCol('files'), { total: sum('size') })
  return snap.data().total
}

export interface FileUrl {
  url?: string
  error: boolean
}

/** `Bytes` → `Blob` → `URL.createObjectURL`, libérée au démontage. */
export function useFileUrl(id: string | undefined, enabled: boolean = true): FileUrl {
  const [state, setState] = useState<FileUrl>({ error: false })
  useEffect(() => {
    if (!id || !enabled) return
    let alive = true
    let url: string | undefined
    loadFile(id)
      .then((blob) => {
        if (!alive) return
        url = URL.createObjectURL(blob)
        setState({ url, error: false })
      })
      .catch(() => alive && setState({ error: true }))
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
      setState({ error: false })
    }
  }, [id, enabled])
  return state
}
