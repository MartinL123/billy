import { collection, doc } from 'firebase/firestore'
import { auth, db } from './app'

export function uid(): string {
  const user = auth.currentUser
  if (!user) throw new Error('Non connecté')
  return user.uid
}

// Tout est rangé sous users/{uid}/…
export const userCol = (name: string) => collection(db, 'users', uid(), name)
export const userDoc = (name: string, id: string) => doc(db, 'users', uid(), name, id)
/** users/{uid} : le document du compte lui-même (compteur d’espace utilisé). */
export const accountDoc = () => doc(db, 'users', uid())
export const newId = (name: string) => doc(userCol(name)).id

/**
 * Les écritures ne sont jamais attendues : hors ligne, leur promesse ne se résout
 * qu’au retour du réseau. Le cache local est à jour tout de suite.
 */
export function send(write: Promise<unknown>): void {
  write.catch((error) => console.error('Écriture Firestore refusée', error))
}
