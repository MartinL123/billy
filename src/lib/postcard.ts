import { distanceMeters } from './community'
import { formatLong, type ISODate } from './dates'
import { formatRouteDistance, routeDistance, type RoutePoint } from './route'
import { formatDuration } from './balade'

// La carte postale de balade (spec V6 § 8.4) : fonctions pures, testées. Le dessin (canvas) vit dans
// features/trajets/postcardImage.ts.

/** Les mètres retirés au début et à la fin du tracé : le domicile ne se devine pas sur l’image. */
export const POSTCARD_CUT_M = 200
/** En dessous, une fois les deux bouts retirés il ne resterait presque rien : pas de tracé du tout, seulement les chiffres. */
export const POSTCARD_MIN_M = 500
/** La taille de l’image (format portrait des réseaux). */
export const POSTCARD_W = 1080
export const POSTCARD_H = 1350

const lerp = (a: RoutePoint, b: RoutePoint, t: number): RoutePoint => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const toLatLng = ([lat, lng]: RoutePoint) => ({ lat, lng })

/** Le point situé à `meters` du début (interpolé sur le segment), avec l’indice du segment. */
function pointAt(points: RoutePoint[], meters: number): { point: RoutePoint; segment: number } {
  let walked = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const d = distanceMeters(toLatLng(a), toLatLng(b))
    if (walked + d >= meters) return { point: d ? lerp(a, b, (meters - walked) / d) : a, segment: i }
    walked += d
  }
  return { point: points[points.length - 1]!, segment: points.length - 1 }
}

/**
 * Le tracé sans ses 200 premiers ni ses 200 derniers mètres (mesurés le long du trajet, la coupe tombe au mètre près
 * sur le segment). Une balade de moins de 500 m ne montre aucun tracé : tableau vide.
 */
export function privacyCut(points: RoutePoint[], cutM = POSTCARD_CUT_M, minM = POSTCARD_MIN_M): RoutePoint[] {
  if (points.length < 2) return []
  const total = routeDistance(points)
  if (total < minM || total <= 2 * cutM) return []
  const start = pointAt(points, cutM)
  const end = pointAt(points, total - cutM)
  const kept = [start.point, ...points.slice(start.segment, end.segment), end.point]
  return kept.length >= 2 ? kept : []
}

/** Le tracé de la carte postale : rien si la balade enregistrée fait moins de 500 m, quelle que soit la longueur des points. */
export const postcardRoute = (points: RoutePoint[], distanceM: number): RoutePoint[] => (distanceM < POSTCARD_MIN_M ? [] : privacyCut(points))

/**
 * La ligne de chiffres : « 2,1 km · 32 min ». V6.1 § 1 : plus de « bouts de territoire » ni de pourcentage ; les rues
 * découvertes viendront quand Flair les connaîtra. Sans durée : la distance seule.
 */
export function postcardLine(distanceM: number, durationMin?: number): string {
  const distance = formatRouteDistance(distanceM).replace(' ', '\u00a0')
  return durationMin ? `${distance} · ${formatDuration(durationMin)}` : distance
}

/** « 22 octobre 2026 · Vertbois » : la date et, au plus, le nom de la commune (aucun autre lieu). */
export const postcardDateLine = (date: ISODate, commune?: string) => [formatLong(date), commune?.trim()].filter(Boolean).join(' · ')

/** « balade-22-octobre-2026.jpg » : un nom de fichier sans espace ni accent. */
export function postcardFileName(date: ISODate): string {
  const words = formatLong(date)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `balade-${words}.jpg`
}

/**
 * Le cadre du tracé dans un rectangle (sans fond de carte : hors ligne ou sans WebGL) : projection simple
 * (longitude corrigée par la latitude), centrée, avec une marge. Renvoie les points en pixels.
 */
export function projectRoute(points: RoutePoint[], box: { x: number; y: number; w: number; h: number }, margin = 0.12): [number, number][] {
  if (!points.length) return []
  const k = Math.cos((points[0]![0] * Math.PI) / 180)
  const xs = points.map((p) => p[1] * k)
  const ys = points.map((p) => -p[0])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const spanX = maxX - minX || 1e-9
  const spanY = maxY - minY || 1e-9
  const innerW = box.w * (1 - 2 * margin)
  const innerH = box.h * (1 - 2 * margin)
  const scale = Math.min(innerW / spanX, innerH / spanY)
  const offX = box.x + (box.w - spanX * scale) / 2
  const offY = box.y + (box.h - spanY * scale) / 2
  return xs.map((x, i) => [offX + (x - minX) * scale, offY + (ys[i]! - minY) * scale])
}
