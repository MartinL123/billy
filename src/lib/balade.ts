import type { ISODate } from './dates'
import { distanceToRoute, routeDistance, simplify, type RoutePoint } from './route'

// Une balade importée d'un fichier GPX (Strava, montre…) : jamais de GPS en direct dans l'app.

export interface TimedPoint {
  lat: number
  lng: number
  /** Heure ISO du point (« 2026-10-12T07:31:02Z »), si le fichier la donne. */
  time?: string
}

/** Tolérance de la simplification : la forme reste la même à 5 m près. */
export const SIMPLIFY_METERS = 5
/** Au plus 500 points enregistrés : quelques Ko dans Firestore, même pour une longue balade. */
export const MAX_WALK_POINTS = 500

/** Distance d'un point à un segment, en mètres, sur une projection locale (suffisant à l'échelle d'une balade). */
function segmentDistance(p: RoutePoint, a: RoutePoint, b: RoutePoint): number {
  const k = Math.cos((a[0] * Math.PI) / 180) * 111320
  const xy = ([lat, lng]: RoutePoint) => [lng * k, lat * 110540]
  const [px, py] = xy(p)
  const [ax, ay] = xy(a)
  const [bx, by] = xy(b)
  const dx = bx! - ax!
  const dy = by! - ay!
  const t = dx || dy ? Math.max(0, Math.min(1, ((px! - ax!) * dx + (py! - ay!) * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(px! - (ax! + t * dx), py! - (ay! + t * dy))
}

/** Douglas-Peucker : garde les points qui changent la forme du tracé de plus de `tolerance` mètres. */
export function douglasPeucker(points: RoutePoint[], tolerance = SIMPLIFY_METERS): RoutePoint[] {
  if (points.length < 3) return points
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = keep[points.length - 1] = true
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()!
    let index = -1
    let max = 0
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i]!, points[first]!, points[last]!)
      if (d > max) {
        max = d
        index = i
      }
    }
    if (index >= 0 && max > tolerance) {
      keep[index] = true
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

/** Simplifie jusqu'à tenir dans `max` points, en relâchant la tolérance si besoin. */
export function simplifyWalk(points: RoutePoint[], max = MAX_WALK_POINTS): RoutePoint[] {
  let tolerance = SIMPLIFY_METERS
  let out = douglasPeucker(simplify(points), tolerance)
  while (out.length > max) {
    tolerance *= 1.5
    out = douglasPeucker(out, tolerance)
  }
  return out
}

/** Le jour local d'une heure ISO (une balade à 0 h 30 heure de Paris est bien de ce jour-là). */
export function localDay(time: string): ISODate {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface ImportedWalk {
  date?: ISODate
  startTime?: string
  endTime?: string
  durationMin?: number
  /** Distance du tracé complet, avant simplification. */
  distanceM: number
  points: RoutePoint[]
}

/** Ce qu'on garde d'un fichier GPX : le jour, la durée, la distance, le tracé simplifié. */
export function importWalk(raw: TimedPoint[]): ImportedWalk {
  const full: RoutePoint[] = raw.map((p) => [p.lat, p.lng])
  const times = raw.map((p) => p.time).filter((t): t is string => Boolean(t) && !Number.isNaN(Date.parse(t!)))
  const startTime = times[0]
  const endTime = times[times.length - 1]
  const durationMin = startTime && endTime ? Math.round((Date.parse(endTime) - Date.parse(startTime)) / 60000) : undefined
  return {
    ...(startTime ? { date: localDay(startTime), startTime } : {}),
    ...(endTime ? { endTime } : {}),
    ...(durationMin ? { durationMin } : {}),
    distanceM: Math.round(routeDistance(full)),
    points: simplifyWalk(full),
  }
}

/** « 47 min », « 1 h 12 », « 2 h » */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** Ce qu'une photo dit d'elle-même (EXIF) : où et quand elle a été prise. */
export interface PhotoClue {
  lat?: number
  lng?: number
  /** Heure de prise de vue, en millisecondes. */
  time?: number
}

/** Une photo prise à moins de 50 m du tracé s'y place ; on tolère 5 min avant le départ et après l'arrivée. */
export const PHOTO_NEAR_ROUTE = 50
const PHOTO_MARGIN_MS = 5 * 60 * 1000

/**
 * Où placer une photo sur la balade : sa position GPS si elle est près du tracé ; sinon, si elle a été prise
 * pendant la balade, l'endroit où l'on était à cette heure-là (d'après les heures du fichier GPX).
 */
export function placePhoto(clue: PhotoClue, points: RoutePoint[], timed: TimedPoint[] = []): { lat: number; lng: number } | undefined {
  if (clue.lat !== undefined && clue.lng !== undefined && distanceToRoute({ lat: clue.lat, lng: clue.lng }, points) <= PHOTO_NEAR_ROUTE) return { lat: clue.lat, lng: clue.lng }
  if (clue.time === undefined) return undefined
  const track = timed.flatMap((p) => (p.time ? [{ ...p, t: Date.parse(p.time) }] : [])).filter((p) => !Number.isNaN(p.t))
  if (track.length < 2) return undefined
  const first = track[0]!
  const last = track[track.length - 1]!
  if (clue.time < first.t - PHOTO_MARGIN_MS || clue.time > last.t + PHOTO_MARGIN_MS) return undefined
  if (clue.time <= first.t) return { lat: first.lat, lng: first.lng }
  if (clue.time >= last.t) return { lat: last.lat, lng: last.lng }
  const i = track.findIndex((p) => p.t >= clue.time!)
  const a = track[i - 1]!
  const b = track[i]!
  const f = b.t === a.t ? 0 : (clue.time - a.t) / (b.t - a.t)
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }
}
