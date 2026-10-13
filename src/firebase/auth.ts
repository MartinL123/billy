import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from './app'

export type { User }

export const watchUser = (onUser: (user: User | null) => void) => onAuthStateChanged(auth, onUser)

export const signIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email.trim(), password)

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim())

export const logOut = () => signOut(auth)

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
      return { field: 'password', text: 'Mot de passe incorrect. Réessaie.' }
    case 'auth/too-many-requests':
      return { field: 'password', text: 'Trop de tentatives. Patiente quelques minutes avant de réessayer.' }
    case 'auth/network-request-failed':
      return { field: 'password', text: 'Pas de réseau. La première connexion a besoin d’Internet.' }
    case 'auth/user-disabled':
      return { field: 'email', text: 'Ce compte est désactivé.' }
    default:
      return { field: 'password', text: 'Connexion impossible. Réessaie dans un instant.' }
  }
}
