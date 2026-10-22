import { placePhrase } from './walkAutoName'

// T-101 (V6.1 § 8) : un exercice au parc, pendant une balade lancée (GPS de Flair). Au départ, les parcs, parcs canins
// et jardins publics à moins de 2 km (OpenStreetMap, une requête Overpass, gardée 7 jours sur l’appareil). Quand la
// position entre dans l’un d’eux et y reste 30 s, une seule fois par balade : « Vous êtes au square X. 3 min de
// « [mission] » ici ? ». Fonctions pures ; le miroir Swift (`FlairNativePlugin.swift`, « Exercice au parc ») fait la
// même chose écran verrouillé, avec une notification locale.

/** Un parc : son nom (vide s’il n’en a pas) et le rectangle qui le contient (degrés). */
export interface ParkArea {
  name: string
  kind: 'parc' | 'canin' | 'jardin'
  s: number
  w: number
  n: number
  e: number
}

/** Rester 30 s dans le parc. */
export const PARK_DWELL_MS = 30_000
/** Rayon des parcs cherchés autour du départ. */
export const PARK_RADIUS_M = 2000
/** Un parc canin connu par un seul point : un carré d’environ 40 m autour. */
const NODE_HALF_DEG = 0.0002
/** Au plus 300 parcs gardés par zone. */
export const MAX_PARKS = 300

/** La requête Overpass : parcs, parcs canins et jardins publics dans un rayon de 2 km, avec leur rectangle. */
export function parksQuery(lat: number, lng: number, radius = PARK_RADIUS_M): string {
  return `[out:json][timeout:25];nwr[leisure~"^(park|dog_park|garden)$"](around:${radius},${lat.toFixed(5)},${lng.toFixed(5)});out tags bb ${MAX_PARKS};`
}

interface OverpassElement {
  type: string
  lat?: number
  lon?: number
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }
  tags?: Record<string, string>
}

const KINDS: Record<string, ParkArea['kind']> = { park: 'parc', dog_park: 'canin', garden: 'jardin' }
const round5 = (n: number) => Math.round(n * 1e5) / 1e5

/** Lit la réponse d’Overpass. Les jardins et parcs privés (accès interdit, jardin d’une résidence) sont écartés. */
export function parseParks(json: { elements?: unknown[] } | null | undefined): ParkArea[] {
  const out: ParkArea[] = []
  for (const el of (json?.elements ?? []) as OverpassElement[]) {
    const tags = el.tags ?? {}
    const kind = KINDS[tags.leisure ?? '']
    if (!kind || /^(private|no)$/.test(tags.access ?? '') || /^(private|residential|domestic)$/.test(tags['garden:type'] ?? '')) continue
    const name = (tags['name:fr'] ?? tags.name ?? '').trim()
    // Un jardin sans nom est souvent privé : seulement les parcs (et parcs canins) sans nom.
    if (!name && kind === 'jardin') continue
    const b = el.bounds ?? (el.lat !== undefined && el.lon !== undefined ? { minlat: el.lat - NODE_HALF_DEG, minlon: el.lon - NODE_HALF_DEG, maxlat: el.lat + NODE_HALF_DEG, maxlon: el.lon + NODE_HALF_DEG } : undefined)
    if (!b) continue
    out.push({ name, kind, s: round5(b.minlat), w: round5(b.minlon), n: round5(b.maxlat), e: round5(b.maxlon) })
    if (out.length >= MAX_PARKS) break
  }
  return out
}

/** Le parc où se trouve le point (le plus petit si plusieurs se chevauchent : un square dans un grand parc). */
export function parkAt(p: { lat: number; lng: number }, parks: ParkArea[]): ParkArea | undefined {
  let best: ParkArea | undefined
  let area = Infinity
  for (const park of parks) {
    if (p.lat < park.s || p.lat > park.n || p.lng < park.w || p.lng > park.e) continue
    const a = (park.n - park.s) * (park.e - park.w)
    if (a < area) {
      area = a
      best = park
    }
  }
  return best
}

/** Où l’on en est pendant la balade : le parc où l’on est depuis `since` (ms), et si l’exercice a déjà été proposé. */
export interface DwellState {
  park?: ParkArea
  since?: number
  offered: boolean
}

export const NO_DWELL: DwellState = { offered: false }

const samePark = (a: ParkArea | undefined, b: ParkArea | undefined) => a === b || (!!a && !!b && a.s === b.s && a.w === b.w && a.n === b.n && a.e === b.e)

/**
 * Une nouvelle position (`at`, avec son heure) ou un simple battement d’horloge (`at` absent, l’iPhone immobile
 * n’envoie plus de positions) : `offer` quand on est dans le même parc depuis 30 s, une seule fois par balade.
 */
export function dwellStep(state: DwellState, now: number, parks: ParkArea[], at?: { lat: number; lng: number }): { state: DwellState; offer?: ParkArea } {
  if (state.offered) return { state }
  let next = state
  if (at) {
    const park = parkAt(at, parks)
    if (!samePark(park, state.park)) next = park ? { park, since: now, offered: false } : NO_DWELL
  }
  if (next.park && next.since !== undefined && now - next.since >= PARK_DWELL_MS) return { state: { ...next, offered: true }, offer: next.park }
  return { state: next }
}

/** « au square des Tilleuls », « dans un parc » (sans nom). */
export function parkPlace(park: Pick<ParkArea, 'name' | 'kind'>): string {
  if (park.name) return placePhrase(park.name)
  return park.kind === 'canin' ? 'dans un parc canin' : 'dans un parc'
}

/** « Vous êtes au square des Tilleuls. 3 min de « Assis » ici ? » (espaces insécables). */
export function parkOfferText(park: Pick<ParkArea, 'name' | 'kind'>, mission: string, minutes: number): string {
  return `Vous êtes ${parkPlace(park)}. ${minutes} min de « ${mission} » ici ?`
}

/** Peut-on proposer un exercice ? Réglage allumé, et une mission du jour à faire (jamais un jour de repos). */
export const canOfferPark = (q: { enabled: boolean; done: boolean; rest: boolean }) => q.enabled && !q.done && !q.rest

/** Le réglage « Me proposer un exercice au parc pendant une balade » : allumé par défaut. */
export const parkOfferOn = (saved?: { parc?: boolean }) => saved?.parc !== false

// ——— Cache des parcs (localStorage, 7 jours, au plus 5 zones) ———

export const PARKS_WEEK_MS = 7 * 24 * 3600 * 1000
export const MAX_ZONES = 5
/** Une zone : la position arrondie au centième de degré (environ 1 km). */
export const parksZone = (lat: number, lng: number) => `${lat.toFixed(2)}_${lng.toFixed(2)}`

export type ParksCache = Record<string, { at: number; parks: ParkArea[] }>

/** Les parcs gardés pour cette zone, s’ils ont moins de 7 jours. */
export function cachedParks(cache: ParksCache, zone: string, now: number): ParkArea[] | undefined {
  const hit = cache[zone]
  return hit && now - hit.at < PARKS_WEEK_MS && Array.isArray(hit.parks) ? hit.parks : undefined
}

/** Ajoute une zone, retire les zones de plus de 7 jours et garde les 5 plus récentes. */
export function storeParks(cache: ParksCache, zone: string, parks: ParkArea[], now: number): ParksCache {
  const entries = Object.entries({ ...cache, [zone]: { at: now, parks } })
    .filter(([, v]) => now - v.at < PARKS_WEEK_MS)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_ZONES)
  return Object.fromEntries(entries)
}
