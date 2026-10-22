// Les choix d’« Affichage » de la carte, gardés sur cet appareil (pas dans Firestore : ce sont des préférences d’écran).
// Plan et 2D par défaut (V5, T-054). V6.1 § 2 (T-095) : le brouillard devient une option, éteint par défaut ; la carte
// des Balades et la balade en cours suivent le même réglage.

export interface MapPrefs {
  satellite: boolean
  three: boolean
  /** Les zones jamais parcourues restent dans la brume (V6.1 § 2). */
  fog: boolean
  /** « Idées de balade » dans le panneau (T-097) : « Masquer » les retire, « Affichage » les remet. */
  ideas: boolean
  /** « Lieux les plus fréquentés » (T-109) : la chaleur des passages, éteinte par défaut. */
  heat: boolean
}

/** Nouvelle clé en V5 pour que le plan revienne une fois ; les choix d’avant le brouillard en option restent valables. */
export const MAP_PREFS_KEY = 'billy-carte-v5'

export const DEFAULT_MAP_PREFS: MapPrefs = { satellite: false, three: false, fog: false, ideas: true, heat: false }

type Store = Pick<Storage, 'getItem' | 'setItem'>

const local = (): Store | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** Les choix gardés ; un stockage indisponible ou abîmé redonne les choix par défaut. */
export function readMapPrefs(store: Store | undefined = local()): MapPrefs {
  try {
    const saved = JSON.parse(store?.getItem(MAP_PREFS_KEY) ?? '{}') as Partial<Record<keyof MapPrefs, unknown>>
    const pick = (key: keyof MapPrefs) => (typeof saved[key] === 'boolean' ? (saved[key] as boolean) : DEFAULT_MAP_PREFS[key])
    return { satellite: pick('satellite'), three: pick('three'), fog: pick('fog'), ideas: pick('ideas'), heat: pick('heat') }
  } catch {
    return { ...DEFAULT_MAP_PREFS }
  }
}

export function writeMapPrefs(prefs: MapPrefs, store: Store | undefined = local()): void {
  try {
    store?.setItem(MAP_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Stockage indisponible : le choix vaut pour cette fois.
  }
}
