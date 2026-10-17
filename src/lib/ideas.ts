import { distanceMeters } from './community'
import { formatShort, type ISODate } from './dates'
import { cellOf } from './fog'

// « À découvrir » (carte-a-decouvrir.md § 4) : des lieux d'OpenStreetMap autour de vous, triés par des règles
// simples selon le profil de Billy. Pas d'IA, rien d'inventé : les phrases sont des modèles remplis par les règles.

export type PlaceKind = 'viewpoint' | 'beach' | 'cape' | 'peak' | 'park' | 'dogpark' | 'nature' | 'water' | 'historic' | 'spot'

export interface Place {
  id: string
  name: string
  kind: PlaceKind
  lat: number
  lng: number
  /** OpenStreetMap indique dog=no. */
  dogsBanned?: boolean
}

/** À égalité de règles, un lieu de balade passe avant un monument, puis un point d'eau (utile, mais pas une sortie). */
const INTEREST: Record<PlaceKind, number> = { viewpoint: 3, beach: 3, cape: 3, peak: 3, park: 3, dogpark: 3, nature: 3, spot: 3, historic: 1, water: 0 }

export const KIND: Record<PlaceKind, { label: string; icon: string; natural: boolean; filter: 'vue' | 'plage' | 'parc' | 'eau' | 'autre' }> = {
  viewpoint: { label: 'Point de vue', icon: '👁', natural: true, filter: 'vue' },
  cape: { label: 'Pointe', icon: '🧭', natural: true, filter: 'vue' },
  peak: { label: 'Sommet', icon: '⛰', natural: true, filter: 'vue' },
  beach: { label: 'Plage', icon: '🏖', natural: true, filter: 'plage' },
  park: { label: 'Parc', icon: '🌳', natural: true, filter: 'parc' },
  dogpark: { label: 'Parc à chiens', icon: '🐕', natural: true, filter: 'parc' },
  nature: { label: 'Espace naturel', icon: '🌿', natural: true, filter: 'parc' },
  water: { label: 'Point d’eau', icon: '💧', natural: false, filter: 'eau' },
  historic: { label: 'Lieu historique', icon: '🏛', natural: false, filter: 'autre' },
  spot: { label: 'Spot de la meute', icon: '🐾', natural: false, filter: 'autre' },
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
  geometry?: { lat: number; lon: number }[]
}

function kindOf(tags: Record<string, string>): PlaceKind | undefined {
  if (tags.tourism === 'viewpoint') return 'viewpoint'
  if (tags.natural === 'beach') return 'beach'
  if (tags.natural === 'cape') return 'cape'
  if (tags.natural === 'peak') return 'peak'
  if (tags.leisure === 'dog_park') return 'dogpark'
  if (tags.leisure === 'nature_reserve') return 'nature'
  if (tags.leisure === 'park') return 'park'
  if (tags.amenity === 'drinking_water') return 'water'
  if (tags.historic) return 'historic'
  return undefined
}

/**
 * La requête Overpass : les lieux dans un rayon de 2 km ; les grandes routes seulement si on en a besoin (chien
 * sensible : « loin des voitures »). Le serveur public peut mettre 20 à 40 s : une seule requête par zone et par semaine.
 */
export function overpassQuery(lat: number, lng: number, { roads = false, radius = 2000 }: { roads?: boolean; radius?: number } = {}): string {
  const around = `around:${radius},${lat.toFixed(5)},${lng.toFixed(5)}`
  const places = `(node[tourism=viewpoint](${around});nwr[natural~"^(beach|cape|peak)$"][name](${around});nwr[leisure~"^(park|dog_park|nature_reserve)$"][name](${around});node[amenity=drinking_water](${around});node[historic][name](${around}););out center tags 120;`
  return `[out:json][timeout:60];${places}${roads ? `way[highway~"^(primary|secondary|trunk)$"](${around});out geom 80;` : ''}`
}

/** Lit la réponse d'Overpass : les lieux (nommés, sauf les points d'eau) et les grandes routes. */
export function parseOverpass(json: { elements?: unknown[] }): { places: Place[]; roads: { lat: number; lng: number }[][] } {
  const places: Place[] = []
  const roads: { lat: number; lng: number }[][] = []
  for (const el of (json.elements ?? []) as OverpassElement[]) {
    const tags = el.tags ?? {}
    if (tags.highway && el.geometry) {
      roads.push(el.geometry.map((p) => ({ lat: p.lat, lng: p.lon })))
      continue
    }
    const kind = kindOf(tags)
    const at = el.center ?? (el.lat !== undefined && el.lon !== undefined ? { lat: el.lat, lon: el.lon } : undefined)
    if (!kind || !at) continue
    const name = tags['name:fr'] ?? tags.name ?? (kind === 'water' ? 'Point d’eau' : kind === 'viewpoint' ? 'Point de vue' : '')
    if (!name) continue
    places.push({ id: `${el.type}/${el.id}`, name, kind, lat: at.lat, lng: at.lon, ...(tags.dog === 'no' ? { dogsBanned: true } : {}) })
  }
  return { places, roads }
}

/** Distance d'un point à la grande route la plus proche (mètres). */
function roadDistance(p: { lat: number; lng: number }, roads: { lat: number; lng: number }[][]): number {
  let best = Infinity
  for (const road of roads) for (const q of road) best = Math.min(best, distanceMeters(p, q))
  return best
}

const NEAREST = 'Le plus proche que vous n’avez pas encore vu.'

export interface DogProfile {
  /** Chien sensible, ou qui a peur en ville. */
  sensitive: boolean
  sporty: boolean
  /** Chiot de moins de 6 mois ou chien senior. */
  short: boolean
}

export interface Idea extends Place {
  meters: number
  explored: boolean
  /** La date de la balade qui l'a découvert, si on la connaît. */
  discoveredOn?: ISODate
  reason: string
  far: boolean
}

/**
 * Les idées, 6 au plus : d'abord les lieux jamais explorés, puis ce qui va avec le profil, puis la distance.
 */
export function rankIdeas(
  places: Place[],
  ctx: { here: { lat: number; lng: number }; cells: Set<string>; roads: { lat: number; lng: number }[][]; profile: DogProfile; lastWalk?: { date: ISODate; points: { lat: number; lng: number }[] } },
  max = 6,
): Idea[] {
  const ideas = places.map((p): Idea & { fit: number } => {
    const meters = distanceMeters(ctx.here, p)
    const explored = ctx.cells.has(cellOf(p))
    const far = roadDistance(p, ctx.roads) > 150
    const info = KIND[p.kind]
    const nearWalk = ctx.lastWalk?.points.some((q) => distanceMeters(q, p) < 250)
    let fit = 0
    if (ctx.profile.sensitive && info.natural && far) fit += 2
    if (ctx.profile.sporty && meters >= 1000 && meters <= 3000) fit += 1
    if (ctx.profile.short && meters < 1000) fit += 1
    const reason = explored
      ? 'Déjà dans son territoire.'
      : ctx.profile.sensitive && info.natural && far
        ? `${info.label} loin des voitures, au calme pour lui.`
        : nearWalk && ctx.lastWalk
          ? `Juste à côté de votre balade du ${formatShort(ctx.lastWalk.date)} : quelques pas de plus.`
          : ctx.profile.short && meters < 1000
            ? 'Tout près : une petite sortie suffit.'
            : NEAREST
    return { ...p, meters, explored, reason, far, fit }
  })
  ideas.sort((a, b) => Number(a.explored) - Number(b.explored) || b.fit - a.fit || INTEREST[b.kind] - INTEREST[a.kind] || a.meters - b.meters)
  // « Le plus proche… » ne vaut que pour le premier lieu qui le mérite.
  let nearestSaid = false
  return ideas.slice(0, max).map(({ fit: _fit, ...idea }) => {
    if (idea.reason !== NEAREST) return idea
    if (nearestSaid) return { ...idea, reason: 'Encore dans le brouillard : un nouveau coin pour lui.' }
    nearestSaid = true
    return idea
  })
}

/** « 1,4 km », « 700 m » */
export const metersLabel = (m: number) => (m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)

/** Itinéraire à pied dans Plans (iPhone). */
export const directionsUrl = (lat: number, lng: number) => `https://maps.apple.com/?daddr=${lat.toFixed(5)},${lng.toFixed(5)}&dirflg=w`

/** Le créateur d'itinéraire de Strava, centré sur le lieu : on y trace soi-même la balade (Billy ne s'y connecte pas). */
export const stravaRouteUrl = (lat: number, lng: number) => `https://www.strava.com/maps/create#15/${lat.toFixed(5)}/${lng.toFixed(5)}`

/** La fiche OpenStreetMap du lieu (« node/123 », « way/456 »…) : la preuve qu'il existe. */
export const osmUrl = (id: string) => `https://www.openstreetmap.org/${id}`

/** La flèche vers un lieu hors de l'écran : ↑ ↗ → ↘ ↓ ↙ ← ↖ */
export function arrowTo(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  const dy = to.lat - from.lat
  const dx = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180)
  const angle = (Math.atan2(dx, dy) * 180) / Math.PI
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
  return arrows[(Math.round(angle / 45) + 8) % 8]!
}
