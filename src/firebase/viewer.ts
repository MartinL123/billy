import { collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { createContext, useContext } from 'react'
import { auth, db } from './app'
import { selfUid } from './paths'

// Mode visiteur (T-048, docs/specs/famille.md) : un proche (compte créé par le propriétaire) regarde tout, sans rien
// modifier. Le propriétaire crée un lien d’invitation (invites/{code}) ; le proche, connecté, l’ouvre et devient
// spectateur (viewers/{son uid} → owner). Le propriétaire voit et retire ses spectateurs.

export interface Viewer {
  id: string
  owner: string
  email?: string
  since?: string
}

/** Vrai quand on regarde le compte d’un autre : tout est en lecture seule. */
export const ReadOnlyContext = createContext(false)
export const useReadOnly = () => useContext(ReadOnlyContext)

/** Le compte que ce compte regarde, s’il est spectateur. */
export async function viewedOwnerOf(uid: string): Promise<string | undefined> {
  const snap = await getDoc(doc(db, 'viewers', uid))
  const owner = snap.data()?.owner
  return typeof owner === 'string' ? owner : undefined
}

/** Un code d’invitation : 12 caractères faciles à lire (pas de 0/O, 1/l). */
export function inviteCode(random: (n: number) => number = (n) => crypto.getRandomValues(new Uint32Array(1))[0]! % n): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => alphabet[random(alphabet.length)]).join('')
}

/** Crée une invitation pour un proche ; renvoie son code. */
export async function createInvite(): Promise<string> {
  const code = inviteCode()
  await setDoc(doc(db, 'invites', code), { owner: selfUid(), createdAt: new Date().toISOString() })
  return code
}

/** Le proche, connecté, accepte l’invitation : il devient spectateur du compte qui l’a invité. */
export async function claimInvite(code: string): Promise<string> {
  const invite = await getDoc(doc(db, 'invites', code))
  const owner = invite.data()?.owner
  if (typeof owner !== 'string') throw new Error('Invitation introuvable')
  if (owner === selfUid()) throw new Error('C’est votre propre invitation')
  await setDoc(doc(db, 'viewers', selfUid()), { owner, code, email: auth.currentUser?.email ?? '', since: new Date().toISOString() })
  return owner
}

/** Les spectateurs du compte connecté. */
export function watchViewers(onChange: (viewers: Viewer[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'viewers'), where('owner', '==', selfUid())),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Viewer, 'id'>) }))),
    () => onChange([]),
  )
}

/** Retire un spectateur (le propriétaire) ou arrête de regarder (le spectateur lui-même). */
export const removeViewer = (viewerUid: string) => deleteDoc(doc(db, 'viewers', viewerUid))
