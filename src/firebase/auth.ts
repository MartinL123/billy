import { deleteUser, updatePassword, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from './app'

export type { User }

export const watchUser = (onUser: (user: User | null) => void) => onAuthStateChanged(auth, onUser)

export const signIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email.trim(), password)

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim())

export const logOut = () => signOut(auth)

/**
 * Vérifie le mot de passe avant une action sensible (suppression du compte).
 * Firebase demande une connexion récente pour supprimer un compte.
 */
export async function confirmPassword(password: string): Promise<void> {
  const user = auth.currentUser
  if (!user?.email) throw new Error('Aucun compte connecté.')
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
}

/** Changer son mot de passe : l'ancien est vérifié d'abord. */
export async function changePassword(current: string, next: string): Promise<void> {
  await confirmPassword(current)
  if (auth.currentUser) await updatePassword(auth.currentUser, next)
}

export const MIN_PASSWORD = 8

/** Supprime le compte lui-même. Les données doivent déjà avoir été supprimées. */
export async function deleteAccount(): Promise<void> {
  if (auth.currentUser) await deleteUser(auth.currentUser)
}

export interface AuthMessage {
  field: 'email' | 'password'
  text: string
}

export function authErrorMessage(error: unknown): AuthMessage {
  const code = error instanceof FirebaseError ? error.code : ''
  switch (code) {
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return { field: 'email', text: "Cette adresse e-mail n'est pas valide." }
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/missing-password':
      return { field: 'password', text: 'Mot de passe incorrect. Réessayez.' }
    case 'auth/too-many-requests':
      return { field: 'password', text: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.' }
    case 'auth/network-request-failed':
      return { field: 'password', text: 'Pas de réseau. La première connexion a besoin d’Internet.' }
    case 'auth/weak-password':
      return { field: 'password', text: 'Mot de passe trop court : 8 caractères au moins.' }
    case 'auth/requires-recent-login':
      return { field: 'password', text: 'Par sécurité, reconnectez-vous puis réessayez.' }
    case 'auth/user-disabled':
      return { field: 'email', text: 'Ce compte est désactivé.' }
    default:
      return { field: 'password', text: 'Connexion impossible. Réessayez dans un instant.' }
  }
}
