// Nom de la rue d’un point du trajet (docs/specs/trajets.md § 3) : « si connu, sinon rien ».
// Service gratuit d’OpenStreetMap (Nominatim), sans clé ; seul le point touché part, jamais la position de l’utilisateur.

import { placeSequence, streetSequence, type RoutePlace, type PlaceKind } from './walkFacts'

interface NominatimReverse {
  name?: string
  category?: string
  type?: string
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

/** T-102 : pour la liste des rues, les voies seulement (un parc va dans les lieux). « square » : une place (« Place… »). */
const ROAD_KEYS = ['road', 'pedestrian', 'footway', 'path', 'cycleway', 'square']

export function roadFromNominatim(json: NominatimReverse | null | undefined): string | undefined {
  const address = json?.address ?? {}
  for (const k of ROAD_KEYS) {
    const value = address[k]?.trim()
    if (value) return value
  }
  return undefined
}

/** Les parcs, jardins, aires… : l’objet trouvé lui-même (`leisure`), ou celui qui contient le point (adresse). */
const PLACE_TYPES: Record<string, PlaceKind> = { park: 'parc', garden: 'jardin', dog_park: 'canin', playground: 'jeux', nature_reserve: 'nature', leisure: 'lieu' }
const kindOf = (type: string, name: string): PlaceKind => (/^square\b/i.test(name) ? 'square' : (PLACE_TYPES[type] ?? 'lieu'))

export function placeFromNominatim(json: NominatimReverse | null | undefined): RoutePlace | undefined {
  const name = json?.name?.trim()
  if (json?.category === 'leisure' && name && json.type && json.type in PLACE_TYPES) return { name, kind: kindOf(json.type, name) }
  const address = json?.address ?? {}
  for (const type of Object.keys(PLACE_TYPES)) {
    const value = address[type]?.trim()
    if (value) return { name: value, kind: kindOf(type, value) }
  }
  return undefined
}

/** Les réponses de Nominatim (zoom 17), gardées le temps de la session ; `null` : pas de réponse (hors ligne, erreur). */
const cache = new Map<string, NominatimReverse>()

async function reverse17(lat: number, lng: number): Promise<NominatimReverse | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const known = cache.get(key)
  if (known) return known
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=fr&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!response.ok) return null
    const json = ((await response.json()) ?? {}) as NominatimReverse
    cache.set(key, json)
    return json
  } catch {
    return null
  }
}

/** Hors ligne, ou si le service ne répond pas en 4 s : rien, sans message d’erreur. */
export async function streetName(lat: number, lng: number): Promise<string | undefined> {
  return streetFromNominatim(await reverse17(lat, lng))
}

/** Le nom de la commune d’un point (Nominatim, zoom 10), ou rien. Une requête par seconde au plus (règle de Nominatim). */
export function communeFromAddress(json: NominatimReverse | null | undefined): string | undefined {
  const a = json?.address ?? {}
  return a.village ?? a.town ?? a.city ?? a.municipality ?? undefined
}

/** Écart minimal entre deux requêtes à Nominatim (règle : une par seconde au plus). */
export const NOMINATIM_GAP_MS = 1100
let lastAsk = 0
let queue: Promise<unknown> = Promise.resolve()

/** File d’attente commune : chaque tâche attend son tour, une requête par seconde au plus pour toute l’app. */
export function nominatimTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastAsk + NOMINATIM_GAP_MS - Date.now()
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    lastAsk = Date.now()
    return task()
  })
  queue = run.catch(() => undefined)
  return run
}

export async function communeName(lat: number, lng: number): Promise<string | undefined> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined
  return nominatimTurn(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=fr&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
      return response.ok ? communeFromAddress(await response.json()) : undefined
    } catch {
      return undefined
    }
  })
}

/** La rue d’un arrêt (V6 § 3), par la file d’attente : hors ligne, rien (elle sera cherchée plus tard). */
export async function stopStreet(lat: number, lng: number): Promise<string | undefined> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined
  return nominatimTurn(() => streetName(lat, lng))
}

/**
 * T-102 : les rues et les lieux d’un trajet, un point après l’autre par la file d’attente (une requête par seconde).
 * Rien (`undefined`) si un point n’a pas de réponse : la balade sera reprise plus tard, en entier.
 */
export async function routePlaces(samples: [number, number][]): Promise<{ streets: string[]; places: RoutePlace[] } | undefined> {
  const roads: (string | undefined)[] = []
  const places: (RoutePlace | undefined)[] = []
  for (const [lat, lng] of samples) {
    // Déjà demandé pendant la session : pas besoin d’attendre son tour.
    const json = cache.get(`${lat.toFixed(4)},${lng.toFixed(4)}`) ?? (await nominatimTurn(() => reverse17(lat, lng)))
    if (!json) return undefined
    roads.push(roadFromNominatim(json))
    places.push(placeFromNominatim(json))
  }
  return { streets: streetSequence(roads), places: placeSequence(places) }
}
