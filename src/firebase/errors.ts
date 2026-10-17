import { FirebaseError } from 'firebase/app'

/**
 * Message à afficher après une erreur. Les erreurs de l'app sont écrites en français et s'affichent telles quelles ;
 * celles de Firebase ou du navigateur sont en anglais : on affiche le message français prévu à la place.
 */
export function errorText(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError || error instanceof DOMException || error instanceof TypeError) return fallback
  return error instanceof Error && error.message ? error.message : fallback
}
