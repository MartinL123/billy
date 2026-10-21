// Petites aides pour un lieu sur la carte (distance, direction, itinéraire). Les idées « À découvrir »
// (lieux OpenStreetMap via Overpass) sont retirées (T-072) : plus aucun appel à Overpass.

/** « 1,4 km », « 700 m » */
export const metersLabel = (m: number) => (m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)

/** Itinéraire à pied dans Plans (iPhone). */
export const directionsUrl = (lat: number, lng: number) => `https://maps.apple.com/?daddr=${lat.toFixed(5)},${lng.toFixed(5)}&dirflg=w`

/** La flèche vers un lieu hors de l’écran : ↑ ↗ → ↘ ↓ ↙ ← ↖ */
export function arrowTo(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  const dy = to.lat - from.lat
  const dx = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180)
  const angle = (Math.atan2(dx, dy) * 180) / Math.PI
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
  return arrows[(Math.round(angle / 45) + 8) % 8]!
}
