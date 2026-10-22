import { noteBone, type Bone, type BoneWithId } from './bones'
import type { ISODate } from './dates'
import { isToTell, type Route, type RouteMoment, type RouteMomentType, type RouteStop } from './route'
import { timeOnTrack } from './walkTimeline'

// « Que s’est-il passé ici ? » et « Raconter la balade » (spec V6 § 6.2). Fonctions pures.

/** Les 6 tuiles d’un arrêt ; « Autre » ouvre le choix complet (avec la note libre). */
export const STOP_TILES: { label: string; type: RouteMomentType | null }[] = [
  { label: 'Pipi', type: 'marque' },
  { label: 'Rencontre', type: 'rencontre' },
  { label: 'Reniflage', type: 'reniflage' },
  { label: 'Jeu', type: 'jeu' },
  { label: 'Moment de stress', type: 'peur' },
  { label: 'Autre', type: null },
]

/** Le repère posé sur un arrêt : à sa position, avec sa rue. Renvoie les repères de la balade avec le nouveau à la fin. */
export function momentOnStop(route: Pick<Route, 'stops' | 'moments'>, stopIndex: number, type: RouteMomentType, note?: string): RouteMoment[] | undefined {
  const stop = route.stops?.[stopIndex]
  if (!stop) return undefined
  return [...route.moments, { lat: stop.lat, lng: stop.lng, type, ...(note ? { note } : {}), ...(stop.street ? { street: stop.street } : {}) }]
}

/** Un arrêt encore à raconter : sans repère, ou avec un repère « À raconter » (T-086). */
const stopUntold = (route: Pick<Route, 'stops'> & { moments?: RouteMoment[] }, momentIndex: number | undefined) => {
  if (momentIndex === undefined) return true
  const m = route.moments?.[momentIndex]
  return Boolean(m && isToTell(m))
}

/** Les arrêts à raconter, dans l’ordre : leur indice dans la balade (0 pour le premier). */
export const stopsToTell = (route: Pick<Route, 'stops'> & { moments?: RouteMoment[] }) => (route.stops ?? []).flatMap((s, i) => (stopUntold(route, s.momentIndex) ? [i] : []))

/**
 * Ce qu’il reste à raconter (T-086) : un arrêt sans repère ou avec un repère « À raconter » (`momentIndex` alors
 * donné), ou un repère « À raconter » hors arrêt. `atS` : secondes depuis le départ, si on les connaît.
 */
/**
 * T-103 (V6.1 § 9) : le repère proposé pour un arrêt encore à raconter. Un arrêt de 3 min ou plus dans un parc, un
 * square, un jardin : « Jeu ? ». Seulement une proposition (rien n’est enregistré ni compté avant le toucher qui la
 * confirme). « Pipi » près d’un spot de la meute : pas de spots tant que la meute est gelée (T-072).
 */
export function suggestedMoment(stop: Pick<RouteStop, 'durS' | 'park'>, moment: Pick<RouteMoment, 'type'> | undefined): RouteMomentType | undefined {
  if (moment && !isToTell(moment)) return undefined
  return stop.durS >= 180 && stop.park ? 'jeu' : undefined
}

export type TellItem = { kind: 'stop'; stopIndex: number; momentIndex?: number; atS: number } | { kind: 'marker'; momentIndex: number; atS?: number }

/** La file de « Raconter la balade », dans l’ordre de la balade (sans trajet daté : les arrêts, puis les repères). */
export function tellQueue(route: Pick<Route, 'stops' | 'moments' | 'track'>): TellItem[] {
  const stops = route.stops ?? []
  const linked = new Set(stops.flatMap((s) => (s.momentIndex !== undefined ? [s.momentIndex] : [])))
  const items: TellItem[] = stops.flatMap((s, stopIndex): TellItem[] => (stopUntold(route, s.momentIndex) ? [{ kind: 'stop', stopIndex, atS: s.at, ...(s.momentIndex !== undefined ? { momentIndex: s.momentIndex } : {}) }] : []))
  route.moments.forEach((m, momentIndex) => {
    if (isToTell(m) && !linked.has(momentIndex)) items.push({ kind: 'marker', momentIndex, ...(route.track ? { atS: timeOnTrack(route.track, m) } : {}) })
  })
  return items.map((item, i) => ({ item, i })).sort((a, b) => (a.item.atS ?? Infinity) - (b.item.atS ?? Infinity) || a.i - b.i).map(({ item }) => item)
}

/**
 * Raconter un élément de la file : un arrêt sans repère reçoit un nouveau repère (`momentOnStop`) ; un repère
 * « À raconter » est REMPLACÉ par ce qui s’est passé (même position, la rue de l’arrêt s’il n’en a pas).
 */
export function tellMoment(route: Pick<Route, 'stops' | 'moments'>, item: TellItem, type: RouteMomentType, note?: string): RouteMoment[] | undefined {
  if (item.momentIndex === undefined) return item.kind === 'stop' ? momentOnStop(route, item.stopIndex, type, note) : undefined
  const old = route.moments[item.momentIndex]
  if (!old) return undefined
  const street = old.street ?? (item.kind === 'stop' ? route.stops?.[item.stopIndex]?.street : undefined)
  const told: RouteMoment = { lat: old.lat, lng: old.lng, type, ...(note ? { note } : {}), ...(street ? { street } : {}) }
  return route.moments.map((m, i) => (i === item.momentIndex ? told : m))
}

/**
 * « C’est raconté ! » : +3 os une seule fois par balade (identifiant fixe, et `toldAt` sur la balade), dans la limite
 * des 3 notes du jour ; seulement si au moins un repère a été posé pendant le récit.
 */
export function tellBone(entryId: string, today: ISODate, bones: (Bone & { id?: string })[], { placed, toldAt }: { placed: number; toldAt?: ISODate }): BoneWithId | undefined {
  if (placed < 1 || toldAt) return undefined
  return noteBone(`raconte-${entryId}`, today, bones)
}
