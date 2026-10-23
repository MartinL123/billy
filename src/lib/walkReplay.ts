import { parisMinutes } from './activity'
import { formatDayHeading, type ISODate } from './dates'
import { distanceMeters } from './community'
import { bearing, cumulative, pointAlong } from './replay'
import type { Route } from './route'
import { effectiveTrack } from './trim'
import { clockAt, clockLabel, streetAt } from './walkSheet'
import { positionAt, windowOf } from './walkStory'

// T-108 (maquette flair-2026-10-22/Revoir) : « Revoir la balade », un point qui avance sur le trajet, l’heure et la rue
// en haut, lecture/pause, barre de position et vitesses. Le calcul, en fonctions pures (testées).

/** Les vitesses proposées ; × 4 par défaut. */
export const REPLAY_SPEEDS = [0.5, 1, 2, 4] as const
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]
export const REPLAY_DEFAULT_SPEED: ReplaySpeed = 4
/** × 1 : une minute de balade par seconde (une balade de 32 min se revoit en 32 s, en 8 s à × 4). */
export const REPLAY_WALK_S_PER_S = 60

/** « × 0,5 », « × 4 » */
export const speedLabel = (speed: number) => `× ${String(speed).replace('.', ',')}`

/**
 * Le début et la fin de la lecture, en secondes depuis le départ : la portion gardée du trajet daté ; sans trajet daté,
 * de 0 à la durée notée (sinon une marche à 4,8 km/h). Rien sans tracé.
 */
export function replaySpan(route: Pick<Route, 'points' | 'track' | 'trimmed' | 'durationMin' | 'distanceM'>): [number, number] | undefined {
  const track = effectiveTrack(route)
  if (track && track.t.length > 1) {
    const [a, b] = windowOf(track)
    if (b > a) return [a, b]
  }
  if (route.points.length < 2) return undefined
  const seconds = route.durationMin ? route.durationMin * 60 : Math.max(60, Math.round(route.distanceM / (4.8 / 3.6)))
  return [0, seconds]
}

/** La position de lecture après `elapsedMs` de temps réel à cette vitesse, sans dépasser la fin. */
export function replayAdvance(s: number, elapsedMs: number, speed: number, [, end]: [number, number]): number {
  return Math.min(end, s + (Math.max(0, elapsedMs) / 1000) * REPLAY_WALK_S_PER_S * speed)
}

/** Où en est la balade à la seconde `s` : la position du point, l’heure (« 8 h 24 ») et la rue si on la connaît. */
export function replayAt(route: Pick<Route, 'points' | 'track' | 'trimmed' | 'durationMin' | 'distanceM' | 'startTime' | 'stops' | 'moments'>, s: number): { lat: number; lng: number; clock?: string; street?: string } | undefined {
  const span = replaySpan(route)
  if (!span) return undefined
  const [a, b] = span
  const t = Math.max(a, Math.min(b, s))
  const track = effectiveTrack(route)
  let at: { lat: number; lng: number }
  if (track && track.t.length > 1) at = positionAt(track, t)
  else {
    const cum = cumulative(route.points)
    const [lat, lng] = pointAlong(route.points, cum, (cum[cum.length - 1] ?? 0) * ((t - a) / (b - a || 1)))
    at = { lat, lng }
  }
  const start = route.startTime && !Number.isNaN(Date.parse(route.startTime)) ? route.startTime : undefined
  const street = streetAt(route, at, [t, t])
  return { ...at, ...(start ? { clock: clockAt(start, t) } : {}), ...(street ? { street } : {}) }
}

/** La légende d’une photo en grand : « Jeudi 22 octobre · 8 h 17 » (l’heure de prise de vue si on la connaît). */
export function photoWhen(date: ISODate, time?: string): string {
  const clock = time && !Number.isNaN(Date.parse(time)) ? clockLabel(parisMinutes(time)) : undefined
  return [formatDayHeading(date), clock].filter(Boolean).join(' · ')
}

/** R-096 : la caméra regarde ce qui vient dans les 45 s de balade suivantes (≈ 50 m à pied). */
export const REPLAY_LOOK_S = 45

/**
 * R-096 : le cap de la caméra en 3ᵉ personne à la seconde `s` : de la position du chien vers celle qu’il aura un peu plus
 * loin (en fin de balade : depuis celle qu’il avait un peu avant). Rien s’il ne bouge pas (un arrêt) : la caméra garde
 * son cap.
 */
export function replayHeading(route: Parameters<typeof replayAt>[0], s: number): number | undefined {
  const span = replaySpan(route)
  if (!span) return undefined
  const here = replayAt(route, s)
  const ahead = replayAt(route, Math.min(span[1], s + REPLAY_LOOK_S))
  const behind = replayAt(route, Math.max(span[0], s - REPLAY_LOOK_S))
  if (!here) return undefined
  const far = (a?: { lat: number; lng: number }, b?: { lat: number; lng: number }) => Boolean(a && b && distanceMeters(a, b) >= 5)
  if (far(here, ahead)) return bearing([here.lat, here.lng], [ahead!.lat, ahead!.lng])
  if (far(behind, here)) return bearing([behind!.lat, behind!.lng], [here.lat, here.lng])
  return undefined
}
