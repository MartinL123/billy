import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  deleteField,
  getDocFromServer,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './app'
import { newId, send, userCol, userDoc } from './paths'
import { deleteFile } from './files'
export { newId } from './paths'
import { buildSeed } from './seed'
import type { BillyDocument, BillyEvent, Dog, Entry, Exposure, TrainingSession, Weight, WithId } from './types'
import { todayISO } from '../lib/dates'
import { nextOccurrence } from '../lib/recurrence'

// ——— Écoute en direct ———

export function watchCollection<T>(name: string, direction: 'asc' | 'desc', onData: (items: WithId<T>[]) => void): () => void {
  return onSnapshot(
    query(userCol(name), orderBy('date', direction)),
    { includeMetadataChanges: true },
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id, pending: d.metadata.hasPendingWrites }))),
    (error) => console.error(`Lecture de ${name} impossible`, error),
  )
}

export function watchDog(onData: (dog: WithId<Dog> | null) => void): () => void {
  return onSnapshot(
    userDoc('dog', 'billy'),
    { includeMetadataChanges: true },
    (snap) => onData(snap.exists() ? { ...(snap.data() as Dog), id: snap.id, pending: snap.metadata.hasPendingWrites } : null),
    (error) => console.error('Lecture du profil impossible', error),
  )
}

// ——— Premier lancement ———

/** Crée le profil et les dates clés si le compte est vide. Vérifié sur le serveur pour ne jamais écraser. */
export async function ensureSeed(): Promise<void> {
  const dogRef = userDoc('dog', 'billy')
  const snap = await getDocFromServer(dogRef)
  if (snap.exists()) return
  const seed = buildSeed(todayISO())
  const batch = writeBatch(db)
  batch.set(dogRef, seed.dog)
  for (const [id, event] of Object.entries(seed.events)) batch.set(userDoc('events', id), event)
  await batch.commit()
}

// ——— Profil ———

export function saveDog(dog: Dog): void {
  send(setDoc(userDoc('dog', 'billy'), dog as DocumentData))
}

// ——— Événements ———

export function saveEvent(id: string, event: BillyEvent): void {
  send(setDoc(userDoc('events', id), event as DocumentData))
}

export function deleteEvent(event: WithId<BillyEvent>, documents: WithId<BillyDocument>[]): void {
  const batch = writeBatch(db)
  batch.delete(userDoc('events', event.id))
  // Les documents liés restent dans le profil, sans lien.
  for (const document of documents) {
    if (document.eventId === event.id) batch.update(userDoc('documents', document.id), { eventId: deleteField() })
  }
  send(batch.commit())
}

/**
 * Coche ou décoche « fait ». Cocher une occurrence récurrente crée la suivante, une seule fois ;
 * renvoie alors son identifiant (pour pouvoir annuler).
 */
export function setEventDone(event: WithId<BillyEvent>, done: boolean): string | undefined {
  const batch = writeBatch(db)
  const ref = userDoc('events', event.id)
  if (!done) {
    batch.update(ref, { done: false, doneAt: deleteField() })
    send(batch.commit())
    return undefined
  }
  const nextDate = event.nextId ? undefined : nextOccurrence(event.date, event.recurrence)
  const nextId = nextDate ? newId('events') : undefined
  if (nextDate && nextId) {
    const next: BillyEvent = {
      title: event.title,
      type: event.type,
      date: nextDate,
      time: event.time,
      recurrence: event.recurrence,
      notes: event.notes,
      done: false,
    }
    batch.set(userDoc('events', nextId), next as DocumentData)
    batch.update(ref, { done: true, doneAt: todayISO(), nextId })
  } else {
    batch.update(ref, { done: true, doneAt: todayISO() })
  }
  send(batch.commit())
  return nextId
}

/** Annule un « fait » tout juste coché, et retire l'occurrence suivante qu'il avait créée. */
export function undoEventDone(eventId: string, createdNextId: string | undefined): void {
  const batch = writeBatch(db)
  if (createdNextId) {
    batch.update(userDoc('events', eventId), { done: false, doneAt: deleteField(), nextId: deleteField() })
    batch.delete(userDoc('events', createdNextId))
  } else {
    batch.update(userDoc('events', eventId), { done: false, doneAt: deleteField() })
  }
  send(batch.commit())
}

// ——— Poids ———

export function saveWeight(id: string, weight: Weight): void {
  send(setDoc(userDoc('weights', id), weight))
}

export function deleteWeight(id: string): void {
  send(deleteDoc(userDoc('weights', id)))
}

// ——— Dressage ———

export function saveSession(id: string, session: TrainingSession): void {
  send(setDoc(userDoc('sessions', id), session as DocumentData))
}

export function deleteSession(id: string): void {
  send(deleteDoc(userDoc('sessions', id)))
}

export function saveExposure(id: string, exposure: Exposure): void {
  send(setDoc(userDoc('exposures', id), exposure as DocumentData))
}

export function deleteExposure(id: string): void {
  send(deleteDoc(userDoc('exposures', id)))
}

// ——— Journal ———

export function saveEntry(id: string, entry: Entry): void {
  send(setDoc(userDoc('entries', id), entry as DocumentData))
}

export function deleteEntry(entry: WithId<Entry>): void {
  send(deleteDoc(userDoc('entries', entry.id)))
  for (const photo of entry.photos) {
    deleteFile(photo.fileId)
    deleteFile(photo.thumbFileId)
  }
}

// ——— Documents ———

export function saveDocument(id: string, document: BillyDocument, previousEventId?: string): void {
  const batch = writeBatch(db)
  batch.set(userDoc('documents', id), document as DocumentData)
  if (previousEventId && previousEventId !== document.eventId) {
    batch.update(userDoc('events', previousEventId), { documentIds: arrayRemove(id) })
  }
  if (document.eventId) batch.update(userDoc('events', document.eventId), { documentIds: arrayUnion(id) })
  send(batch.commit())
}

export function updateDocumentMeta(id: string, patch: Partial<BillyDocument>): void {
  send(updateDoc(userDoc('documents', id), patch as DocumentData))
}

export function deleteDocument(document: WithId<BillyDocument>, eventExists: boolean): void {
  const batch = writeBatch(db)
  batch.delete(userDoc('documents', document.id))
  if (document.eventId && eventExists) {
    batch.update(userDoc('events', document.eventId), { documentIds: arrayRemove(document.id) })
  }
  send(batch.commit())
  for (const fileId of document.fileIds) deleteFile(fileId)
  deleteFile(document.thumbFileId)
}
