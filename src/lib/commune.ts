import { douglasPeucker } from './balade'
import { polygonArea } from './fog'
import type { RoutePoint } from './route'

// La commune où se trouve la carte, pour « 2 % de Saint-Briac-sur-Mer découvert » (carte-a-decouvrir.md § 3).
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
  osm_id?: number
  name?: string
  address?: Record<string, string | undefined>
  geojson?: { type: string; coordinates: unknown }
}

const MAX_RING = 400

/** Lit la réponse de Nominatim (reverse, zoom 10, polygon_geojson=1) ; rien si ce n'est pas une surface. */
export function communeFromNominatim(json: NominatimArea | null | undefined): (Commune & { id: string }) | undefined {
  const geo = json?.geojson
  if (!geo || !json?.osm_id) return undefined
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
  return { id: `${json.osm_type ?? 'r'}${json.osm_id}`, name, areaM2: Math.round(polygonArea(outer)), bbox: [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)], ring }
}

/** La commune connue qui contient ce point, s'il y en a une. */
export const communeAt = <C extends Commune>(communes: C[], p: { lat: number; lng: number }, inside: (p: { lat: number; lng: number }, ring: Commune['ring']) => boolean) =>
  communes.find((c) => p.lat >= c.bbox[0] && p.lat <= c.bbox[2] && p.lng >= c.bbox[1] && p.lng <= c.bbox[3] && inside(p, c.ring))
