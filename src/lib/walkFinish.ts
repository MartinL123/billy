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
