import { importKey, knownImportKeys } from './activity'

// T-059 : avant d'effacer la copie de l'iPhone, on vérifie toujours une balade précise dans la base locale.
// L'import peut ne rien renvoyer (« Réessayer » après un enregistrement qui a en fait réussi : la clé est déjà connue) ;
// on cherche alors l'entrée qui porte la clé de cette balade. Si on ne la trouve pas, on n'efface rien.

type KeyedEntry = { id: string; importKey?: string; route?: { startTime?: string; points?: { lat: number; lng: number }[] } }

/**
 * Les balades à relire avant `clearWalk` : celles que l'import vient d'écrire, sinon celle déjà connue par sa clé.
 * `undefined` : rien à vérifier, donc rien à effacer.
 */
export function entriesToVerify(saved: string[], points: { lat: number; lng: number; time?: string }[], entries: KeyedEntry[]): string[] | undefined {
  if (saved.length) return saved
  const key = importKey(points)
  if (!key) return undefined
  const found = entries.filter((e) => knownImportKeys([e]).has(key)).map((e) => e.id)
  return found.length ? found : undefined
}

/** Sous ce temps, ce n'est pas une balade (un départ par erreur) : effacée sans rien demander. */
export const ASK_AFTER_MS = 2 * 60 * 1000

/**
 * T-060 : que faire d'une balade arrêtée. Assez longue et assez de chemin : la garder. Moins de 2 minutes : un départ
 * par erreur, l'effacer. Sinon (le GPS n'a presque rien donné : position approximative, immeubles, tunnel) :
 * demander, jamais d'effacement silencieux ; on peut au moins noter la sortie et sa durée.
 */
export function endDecision(tooShortWalk: boolean, elapsed: number): 'garder' | 'effacer' | 'demander' {
  if (!tooShortWalk) return 'garder'
  return elapsed < ASK_AFTER_MS ? 'effacer' : 'demander'
}
