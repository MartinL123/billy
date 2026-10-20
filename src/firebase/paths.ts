import { collection, doc } from 'firebase/firestore'
import { auth, db } from './app'

/**
 * Mode visiteur (T-048) : un proche invité regarde les données d’un autre compte, en lecture seule. Toutes les
 * lectures vont alors sous users/{propriétaire}/… ; les écritures y sont refusées par firestore.rules.
 */
let viewedOwner: string | null = null
export const setViewedOwner = (owner: string | null) => {
  viewedOwner = owner
}
export const viewedOwnerUid = () => viewedOwner

/** Le compte dont on affiche les données : le sien, ou celui qu’on regarde en visiteur. */
export function uid(): string {
  if (viewedOwner) return viewedOwner
  const user = auth.currentUser
  if (!user) throw new Error('Non connecté')
  return user.uid
}

/** Le compte connecté lui-même (jamais celui qu’on regarde). */
export function selfUid(): string {
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
  // Visiteur : les écrans d’écriture lui sont fermés ; si une écriture passe quand même, firestore.rules la refuse.
  if (viewedOwner) return void write.catch(() => undefined)
  write.catch((error) => console.error('Écriture Firestore refusée', error))
}
