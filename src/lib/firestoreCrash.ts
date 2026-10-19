// R-042 : dans l'app iOS, quand l'app passe en arrière-plan (écran verrouillé pendant une balade), WebKit suspend son
// processus réseau, qui tient aussi IndexedDB. Firestore perd alors sa transaction en cours et s'arrête pour de bon
// (« INTERNAL ASSERTION FAILED … without an in-progress transaction ») : plus aucune lecture ni écriture ne passe
// jusqu'au rechargement de la page. Ce fichier reconnaît cette panne ; la reprise est dans `src/firebase/recover.ts`.

/** Vrai pour la panne interne de Firestore (quel que soit son numéro de version ou d'assertion). */
export function isFirestoreCrash(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message}` : typeof error === 'object' && error ? String((error as { message?: unknown }).message ?? '') : String(error ?? '')
  return /FIRESTORE \([^)]*\) INTERNAL ASSERTION FAILED/.test(text)
}

/** Au plus un rechargement toutes les 30 s : jamais de boucle si la panne revient aussitôt. */
export const RELOAD_EVERY_MS = 30_000
export const mayReload = (lastReload: number | undefined, now: number) => lastReload === undefined || Number.isNaN(lastReload) || now - lastReload >= RELOAD_EVERY_MS
