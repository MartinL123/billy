import type { RoutePoint } from './route'

// Import d'un fichier GPX (montre, appli de course…) dans le traceur : les points du parcours, allégés.

/** Au plus 200 points : assez pour la forme d'une balade, quelques Ko dans Firestore. */
export const MAX_GPX_POINTS = 200
export const MAX_GPX_BYTES = 5 * 1024 * 1024

const POINT = /<(?:trkpt|rtept)\b([^>]*)>/g
const attr = (attrs: string, name: string) => Number(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`).exec(attrs)?.[1])

/** Les points de trace (trkpt) ou d'itinéraire (rtept), dans l'ordre. */
export function parseGpx(text: string): RoutePoint[] {
  const points: RoutePoint[] = []
  for (const match of text.matchAll(POINT)) {
    const lat = attr(match[1]!, 'lat')
    const lng = attr(match[1]!, 'lon')
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) points.push([lat, lng])
  }
  return points
}

/** Garde un point sur n, plus toujours le premier et le dernier. */
export function thin(points: RoutePoint[], max = MAX_GPX_POINTS): RoutePoint[] {
  if (points.length <= max) return points
  const step = (points.length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]!)
}
