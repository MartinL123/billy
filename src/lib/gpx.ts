import type { RoutePoint } from './route'
import type { TimedPoint } from './balade'

// Import d'un fichier GPX (montre, appli de course…) dans le traceur : les points du parcours, allégés.

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

/**
 * Lecture complète d'un GPX dans le navigateur (DOMParser) : le nom de l'activité et les points avec leur heure.
 * Les points de trace d'abord ; à défaut, ceux d'un itinéraire. Les calculs (jour, durée, simplification) sont dans
 * lib/balade.ts, testés sans XML.
 */
export function readGpx(text: string): { name?: string; points: TimedPoint[] } {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) return { points: [] }
  const read = (tag: string) =>
    Array.from(doc.getElementsByTagName(tag)).flatMap((el): TimedPoint[] => {
      if (el.getAttribute('lat') === null || el.getAttribute('lon') === null) return []
      const lat = Number(el.getAttribute('lat'))
      const lng = Number(el.getAttribute('lon'))
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return []
      const time = el.getElementsByTagName('time')[0]?.textContent?.trim()
      return [{ lat, lng, ...(time ? { time } : {}) }]
    })
  const trk = read('trkpt')
  const name = (doc.querySelector('trk > name') ?? doc.querySelector('metadata > name'))?.textContent?.trim()
  return { ...(name ? { name } : {}), points: trk.length ? trk : read('rtept') }
}
