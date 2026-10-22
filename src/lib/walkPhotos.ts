import { placePhoto, timesAlong, type TimedPoint } from './balade'
import type { Route } from './route'

// T-103 (V6.1 § 9) : les photos prises pendant la balade, retrouvées dans la photothèque de l’iPhone (avec l’accord de
// la personne). La partie pure : la fenêtre de la balade, le tri par heure, la place de chaque photo sur le tracé.

type WalkTimes = Pick<Route, 'startTime' | 'endTime' | 'durationMin' | 'trimmed'>

/** Le départ et l’arrivée de la balade (ISO) ; recadrée : la portion gardée. Rien sans heure de départ. */
export function walkWindow(route: WalkTimes): { start: string; end: string } | undefined {
  const t0 = route.startTime ? Date.parse(route.startTime) : NaN
  if (Number.isNaN(t0)) return undefined
  const endMs = route.endTime ? Date.parse(route.endTime) : route.durationMin ? t0 + route.durationMin * 60_000 : NaN
  if (Number.isNaN(endMs) || endMs <= t0) return undefined
  const start = route.trimmed ? t0 + route.trimmed.startS * 1000 : t0
  const end = route.trimmed ? Math.min(endMs, t0 + route.trimmed.endS * 1000) : endMs
  return end > start ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() } : undefined
}

/**
 * Les photos prises pendant la balade (bornes comprises), dans l’ordre, sans celles déjà dans le souvenir (même heure
 * de prise de vue à la seconde près). Une photo sans heure n’est jamais retenue.
 */
export function photosInWindow<P extends { time?: string }>(photos: P[], window: { start: string; end: string }, known: { time?: string }[] = []): P[] {
  const start = Date.parse(window.start)
  const end = Date.parse(window.end)
  const seen = new Set(known.flatMap((k) => (k.time && !Number.isNaN(Date.parse(k.time)) ? [Math.round(Date.parse(k.time) / 1000)] : [])))
  return photos
    .map((p) => ({ p, ms: p.time ? Date.parse(p.time) : NaN }))
    .filter(({ ms }) => !Number.isNaN(ms) && ms >= start && ms <= end)
    .filter(({ ms }) => {
      const key = Math.round(ms / 1000)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.ms - b.ms)
    .map(({ p }) => p)
}

/** Les heures du tracé : le trajet daté s’il est là (exact), sinon réparties le long du tracé allégé. */
export function routeTimedPoints(route: Pick<Route, 'points' | 'track' | 'startTime' | 'durationMin'>): TimedPoint[] {
  const t0 = route.startTime ? Date.parse(route.startTime) : NaN
  const track = route.track
  if (track && track.t.length > 1 && !Number.isNaN(t0)) return track.t.map((t, i) => ({ lat: track.lat[i]!, lng: track.lng[i]!, time: new Date(t0 + t * 1000).toISOString() }))
  return timesAlong(route.points, route.startTime, route.durationMin)
}

/**
 * Où poser une photo retrouvée : sa position (si elle est près du tracé), sinon son heure recoupée avec le tracé
 * (« sinon son heure recoupée avec le tracé », T-097). Rien si on ne sait pas.
 */
export function placeOnWalk(photo: { time?: string; lat?: number; lng?: number }, route: Pick<Route, 'points' | 'track' | 'startTime' | 'durationMin'>): { lat: number; lng: number } | undefined {
  const ms = photo.time ? Date.parse(photo.time) : NaN
  const clue = { ...(photo.lat !== undefined && photo.lng !== undefined ? { lat: photo.lat, lng: photo.lng } : {}), ...(Number.isNaN(ms) ? {} : { time: ms }) }
  return placePhoto(clue, route.points, routeTimedPoints(route))
}

/** « 3 photos de la balade ajoutées », « 1 photo de la balade ajoutée ». */
export const photosAddedLine = (n: number) => (n > 1 ? `${n} photos de la balade ajoutées` : '1 photo de la balade ajoutée')
