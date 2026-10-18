// Nom de la rue d’un point du trajet (docs/specs/trajets.md § 3) : « si connu, sinon rien ».
// Service gratuit d’OpenStreetMap (Nominatim), sans clé ; seul le point touché part, jamais la position de l’utilisateur.

interface NominatimReverse {
  name?: string
  address?: Record<string, string | undefined>
}

const KEYS = ['road', 'pedestrian', 'footway', 'path', 'cycleway', 'square', 'park', 'leisure']

/** Le nom à afficher, ou rien. */
export function streetFromNominatim(json: NominatimReverse | null | undefined): string | undefined {
  const address = json?.address ?? {}
  for (const key of KEYS) {
    const value = address[key]?.trim()
    if (value) return value
  }
  return undefined
}

const cache = new Map<string, string | undefined>()

/** Hors ligne, ou si le service ne répond pas en 4 s : rien, sans message d’erreur. */
export async function streetName(lat: number, lng: number): Promise<string | undefined> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (cache.has(key)) return cache.get(key)
  if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=fr&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!response.ok) return undefined
    const name = streetFromNominatim(await response.json())
    cache.set(key, name)
    return name
  } catch {
    return undefined
  }
}

/** Le nom de la commune d’un point (Nominatim, zoom 10), ou rien. Une requête par seconde au plus (règle de Nominatim). */
export function communeFromAddress(json: NominatimReverse | null | undefined): string | undefined {
  const a = json?.address ?? {}
  return a.village ?? a.town ?? a.city ?? a.municipality ?? undefined
}

let lastAsk = 0
export async function communeName(lat: number, lng: number): Promise<string | undefined> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined
  const wait = lastAsk + 1100 - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastAsk = Date.now()
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=fr&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
    return response.ok ? communeFromAddress(await response.json()) : undefined
  } catch {
    return undefined
  }
}
