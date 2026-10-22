// T-097 (V6.1 § 4) : le cadrage des mini-cartes du journal, calculé ici plutôt que par MapLibre (fitBounds) : l’image
// de la carte et ce qu’on pose dessus en HTML (arrêts, photos) utilisent exactement la même projection.
// Web Mercator, tuiles de 512 px (celles de MapLibre) : à un zoom z, le monde fait 512 × 2^z pixels.

type LatLng = readonly [number, number]

export interface MiniView {
  center: [number, number]
  zoom: number
}

const TILE = 512
const MAX_ZOOM = 17

const mercX = (lng: number) => (lng + 180) / 360
const mercY = (lat: number) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
}
const latOf = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI

/** Le centre et le zoom qui montrent tous les points dans une image `width` × `height`, avec une marge `pad` (px). */
export function fitView(points: LatLng[], width: number, height: number, pad: number): MiniView {
  const xs = points.map((p) => mercX(p[1]))
  const ys = points.map((p) => mercY(p[0]))
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const spanX = Math.max(x1 - x0, 1e-9)
  const spanY = Math.max(y1 - y0, 1e-9)
  const scale = Math.min(Math.max(1, width - 2 * pad) / spanX, Math.max(1, height - 2 * pad) / spanY)
  const zoom = Math.min(MAX_ZOOM, Math.log2(scale / TILE))
  return { center: [latOf((y0 + y1) / 2), (x0 + x1) / 2 * 360 - 180], zoom }
}

/** La position d’un point dans l’image (px depuis le coin haut gauche). */
export function projectInView(view: MiniView, width: number, height: number, [lat, lng]: LatLng): { x: number; y: number } {
  const world = TILE * 2 ** view.zoom
  return { x: width / 2 + (mercX(lng) - mercX(view.center[1])) * world, y: height / 2 + (mercY(lat) - mercY(view.center[0])) * world }
}
