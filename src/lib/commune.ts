import { douglasPeucker } from './balade'
import { polygonArea } from './fog'
import type { RoutePoint } from './route'

// La commune où se trouve la carte (carte-a-decouvrir.md § 3) : la part découverte reste une donnée du brouillard (V6.1 : plus affichée).
// Contour demandé une seule fois à Nominatim (OpenStreetMap), puis gardé dans users/{uid}/communes/{id}.

export interface Commune {
  name: string
  areaM2: number
  /** [sud, ouest, nord, est] */
  bbox: [number, number, number, number]
  /** Contour extérieur simplifié (Firestore refuse les tableaux de tableaux). */
  ring: { lat: number; lng: number }[]
}

interface NominatimArea {
  osm_type?: string
  /** jsonv2 : « city », « town », « village », « municipality »… ou « country », « state » loin des communes. */
  addresstype?: string
  osm_id?: number
  name?: string
  address?: Record<string, string | undefined>
  geojson?: { type: string; coordinates: unknown }
}

const MAX_RING = 400

// R-086 : en mer ou sur une plage, Nominatim n’a pas de commune et répond le pays (« France métropolitaine ») ou la
// région. Ce n’est pas une commune : rien n’est gardé. La plus grande commune de métropole (Arles) fait 759 km².
const COMMUNE_TYPES = new Set(['city', 'town', 'village', 'municipality'])
/** Surface au-delà de laquelle ce n’est pas une commune. */
export const MAX_COMMUNE_M2 = 1000e6
/** Cadre [sud, ouest, nord, est] au-delà duquel ce n’est pas une commune (celui d’Arles fait environ 1 700 km²). */
export const MAX_COMMUNE_BBOX_M2 = 3000e6

/** Surface approchée du cadre, en m² (1° de latitude ≈ 111 km). */
function bboxArea([s, w, n, e]: Commune['bbox']): number {
  const k = 111_320
  return (n - s) * k * (e - w) * k * Math.cos((((s + n) / 2) * Math.PI) / 180)
}

/** Une vraie commune, pas un pays ou une région gardés par erreur avant R-086. */
export const isCommuneSized = (c: Pick<Commune, 'areaM2' | 'bbox'>) => c.areaM2 <= MAX_COMMUNE_M2 && bboxArea(c.bbox) <= MAX_COMMUNE_BBOX_M2

/** Lit la réponse de Nominatim (reverse, zoom 10, polygon_geojson=1) ; rien si ce n’est pas une surface. */
export function communeFromNominatim(json: NominatimArea | null | undefined): (Commune & { id: string }) | undefined {
  const geo = json?.geojson
  if (!geo || !json?.osm_id) return undefined
  if (json.addresstype && !COMMUNE_TYPES.has(json.addresstype)) return undefined
  const polygons = (geo.type === 'Polygon' ? [geo.coordinates] : geo.type === 'MultiPolygon' ? (geo.coordinates as unknown[]) : []) as [number, number][][][]
  // Le plus grand contour extérieur (une commune avec une île : on garde le continent).
  const rings = polygons.map((p) => (p[0] ?? []).map(([lng, lat]) => ({ lat, lng })))
  const outer = rings.sort((a, b) => polygonArea(b) - polygonArea(a))[0]
  if (!outer || outer.length < 4) return undefined
  let tolerance = 5
  let simplified: RoutePoint[] = outer.map((p): RoutePoint => [p.lat, p.lng])
  while (simplified.length > MAX_RING) {
    simplified = douglasPeucker(simplified, tolerance)
    tolerance *= 2
  }
  const ring = simplified.map(([lat, lng]) => ({ lat, lng }))
  const lats = ring.map((p) => p.lat)
  const lngs = ring.map((p) => p.lng)
  const a = json.address ?? {}
  const name = a.village ?? a.town ?? a.city ?? a.municipality ?? json.name ?? 'la commune'
  const commune = { id: `${json.osm_type ?? 'r'}${json.osm_id}`, name, areaM2: Math.round(polygonArea(outer)), bbox: [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)] as Commune['bbox'], ring }
  return isCommuneSized(commune) ? commune : undefined
}

/**
 * La commune connue qui contient ce point, s’il y en a une : la plus petite (R-086 : un pays gardé par erreur
 * contient tout, il ne doit jamais passer devant la vraie commune ; trop grand, il est ignoré).
 */
export const communeAt = <C extends Commune>(communes: C[], p: { lat: number; lng: number }, inside: (p: { lat: number; lng: number }, ring: Commune['ring']) => boolean) =>
  communes
    .filter((c) => isCommuneSized(c) && p.lat >= c.bbox[0] && p.lat <= c.bbox[2] && p.lng >= c.bbox[1] && p.lng <= c.bbox[3] && inside(p, c.ring))
    .sort((a, b) => a.areaM2 - b.areaM2)[0]
