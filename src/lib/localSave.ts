import { errorText, withTimeout } from './timeout'

// R-045 : avant d'effacer la copie d'une balade (fichier de l'iPhone, ou marche de la Watch à relire), on vérifie
// qu'elle a bien atteint la base locale de Firestore. Si Firestore est en panne (iOS a coupé IndexedDB), l'écriture
// peut avoir été lancée sans jamais arriver : on garde alors la copie.

/** Délai maximum pour relire la base locale. */
export const LOCAL_CHECK_MS = 5000

export class NotSavedError extends Error {
  constructor(detail: string) {
    super(`Balade absente de la base locale : ${detail}`)
    this.name = 'NotSavedError'
  }
}

/**
 * Toutes les balades `ids` sont-elles dans la base locale ? `exists(id)` la relit (sans réseau). Lève `NotSavedError`
 * si l'une manque, si la lecture échoue ou si elle ne répond pas dans le délai.
 */
export async function ensureSavedLocally(ids: string[], exists: (id: string) => Promise<boolean>, ms = LOCAL_CHECK_MS): Promise<void> {
  if (!ids.length) return
  let found: boolean[]
  try {
    found = await withTimeout(Promise.all(ids.map(exists)), ms, 'lecture de la base locale')
  } catch (error) {
    throw new NotSavedError(errorText(error))
  }
  const missing = ids.filter((_, i) => !found[i])
  if (missing.length) throw new NotSavedError(`${missing.length} sur ${ids.length} introuvable${missing.length > 1 ? 's' : ''}`)
}
