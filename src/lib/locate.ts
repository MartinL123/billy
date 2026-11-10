import { fitPadding, type Padding } from './mapFrame'

// R-114 : « Me situer ». Une position fraîche et précise (GPS, pas le Wi-Fi d'il y a 5 min), la carte centrée sur le
// point bleu à chaque toucher, puis suivie 2 min. Ce fichier ne dépend ni de MapLibre ni du navigateur.

/** Demande au GPS : précise, jamais une position gardée en mémoire, 15 s au plus. */
export const LOCATE_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
/** Après un toucher, le point bleu suit pendant 2 min, puis s'arrête (batterie). */
export const FOLLOW_MS = 2 * 60_000
/** Le zoom sur le point bleu : la rue et ses voisines. */
export const LOCATE_ZOOM = 16

export interface MyPosition {
  lat: number
  lng: number
  /** Le rayon de précision (m) donné par l'iPhone. */
  accuracy?: number
}

/** Le cadrage sur le point bleu : au centre de la partie de carte laissée visible par les boutons et le panneau. */
export function locateView(me: MyPosition, wanted: Padding, width: number, height: number): { center: [number, number]; zoom: number; padding: Padding } {
  return { center: [me.lng, me.lat], zoom: LOCATE_ZOOM, padding: fitPadding(wanted, width, height) }
}

const EARTH_M = 6_371_000

/**
 * Le cercle de précision autour du point bleu, en polygone ([lng, lat], fermé). Rien sous 5 m (invisible) ni sans
 * précision connue.
 */
export function accuracyRing(me: MyPosition, steps = 48): [number, number][] {
  const r = me.accuracy
  if (!r || !Number.isFinite(r) || r < 5) return []
  const lat = (me.lat * Math.PI) / 180
  const dLat = (r / EARTH_M) * (180 / Math.PI)
  const dLng = dLat / Math.cos(lat)
  const ring: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const a = (2 * Math.PI * i) / steps
    ring.push([me.lng + dLng * Math.cos(a), me.lat + dLat * Math.sin(a)])
  }
  ring.push(ring[0]!)
  return ring
}
