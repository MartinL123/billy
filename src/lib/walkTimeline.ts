import { distanceMeters } from './community'
import { formatRouteDistance, routeMomentInfo, type Route, type RouteMoment } from './route'
import type { Track } from './track'
import { clockAt, durationText, kmhText, weatherText } from './walkSheet'
import { fastMoment, heartPeak } from './walkStory'

// La frise « Ce qui s’est passé » (spec V6 § 6.2) : une ligne par événement, dans l’ordre de la balade. Fonction pure,
// calculée sur ce que la balade a gardé ; une balade ancienne sans trajet daté n’a que ses repères (sans heure).

export type TimelineEvent =
  | { kind: 'depart'; atS: number; street?: string; weather?: Route['weather'] }
  | { kind: 'stop'; atS: number; durS: number; number: number; stopIndex: number; street?: string; moment?: RouteMoment; momentIndex?: number; heart?: number; lat: number; lng: number }
  | { kind: 'moment'; atS?: number; moment: RouteMoment; momentIndex: number }
  | { kind: 'fast'; atS: number; kmh: number; meters: number }
  | { kind: 'heart'; atS: number; bpm: number }
  | { kind: 'retour'; atS: number }

/** Un pic de cœur pendant un arrêt (ou dans la minute qui suit) se lit sur cet arrêt. */
const HEART_STOP_S = 60

/** L’heure (en secondes depuis le départ) du point du trajet le plus proche d’un repère. */
export function timeOnTrack(track: Track, p: { lat: number; lng: number }): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < track.t.length; i++) {
    const d = distanceMeters(p, { lat: track.lat[i]!, lng: track.lng[i]! })
    if (d < bestD) {
      bestD = d
      best = track.t[i]!
    }
  }
  return best
}

/** L’ordre d’un repère le long du tracé allégé (balade sans trajet daté). */
function indexOnPoints(points: Route['points'], p: { lat: number; lng: number }): number {
  let best = 0
  let bestD = Infinity
  points.forEach(([lat, lng], i) => {
    const d = distanceMeters(p, { lat, lng })
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

/**
 * La frise : départ (rue, météo) · arrêts (heure, durée, rue, repère) · repères hors arrêt · moment rapide · pic de cœur
 * · retour. Sans trajet daté : seulement les repères, dans l’ordre du tracé.
 */
export function walkTimeline(route: Route, { startStreet }: { startStreet?: string } = {}): TimelineEvent[] {
  const track = route.track
  const stops = route.stops ?? []
  const linked = new Set(stops.flatMap((s) => (s.momentIndex !== undefined ? [s.momentIndex] : [])))
  const loose = route.moments.flatMap((moment, momentIndex) => (linked.has(momentIndex) ? [] : [{ moment, momentIndex }]))
  if (!track) {
    return loose
      .map((m) => ({ ...m, order: indexOnPoints(route.points, m.moment) }))
      .sort((a, b) => a.order - b.order)
      .map(({ moment, momentIndex }): TimelineEvent => ({ kind: 'moment', moment, momentIndex }))
  }
  const t0 = track.t[0] ?? 0
  const end = track.t[track.t.length - 1] ?? 0
  const heart = heartPeak(track, route.hr)
  const fast = fastMoment(track)
  const heartStop = heart ? stops.findIndex((s) => heart.atS >= s.at - HEART_STOP_S && heart.atS <= s.at + s.durS + HEART_STOP_S) : -1
  const events: TimelineEvent[] = [{ kind: 'depart', atS: t0, ...(startStreet ? { street: startStreet } : {}), ...(route.weather ? { weather: route.weather } : {}) }]
  stops.forEach((s, i) => {
    const moment = s.momentIndex !== undefined ? route.moments[s.momentIndex] : undefined
    events.push({ kind: 'stop', atS: s.at, durS: s.durS, number: i + 1, stopIndex: i, lat: s.lat, lng: s.lng, ...(s.street ? { street: s.street } : {}), ...(moment ? { moment, momentIndex: s.momentIndex } : {}), ...(heart && heartStop === i ? { heart: heart.bpm } : {}) })
  })
  for (const m of loose) events.push({ kind: 'moment', atS: timeOnTrack(track, m.moment), ...m })
  if (fast) events.push({ kind: 'fast', atS: fast.startS, kmh: fast.kmh, meters: fast.meters })
  if (heart && heartStop < 0) events.push({ kind: 'heart', atS: heart.atS, bpm: heart.bpm })
  events.push({ kind: 'retour', atS: end })
  // Dans l’ordre de la balade ; à la même seconde, l’ordre ci-dessus (départ d’abord, retour à la fin).
  const rank = (e: TimelineEvent) => (e.kind === 'depart' ? -1 : e.kind === 'retour' ? 1 : 0)
  return events.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e) - rank(b.e) || (a.e.atS ?? 0) - (b.e.atS ?? 0) || a.i - b.i).map(({ e }) => e)
}

/** Le texte d’une ligne : un titre, un détail, l’heure si on la connaît. */
export function timelineText(event: TimelineEvent, startTime?: string): { title: string; detail?: string; clock?: string } {
  const clock = startTime && event.atS !== undefined && !Number.isNaN(Date.parse(startTime)) ? clockAt(startTime, event.atS) : undefined
  const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined
  const at = clock ? { clock } : {}
  switch (event.kind) {
    case 'depart':
      return { title: 'Départ', ...at, ...opt(join(event.street, weatherText(event.weather))) }
    case 'stop':
      return { title: `Arrêt de ${durationText(event.durS)}`, ...at, ...opt(join(event.street, event.heart ? `votre cœur à ${event.heart}` : undefined)) }
    case 'moment':
      return { title: routeMomentInfo(event.moment.type).label, ...at, ...opt(join(event.moment.street, event.moment.note)) }
    case 'fast':
      return { title: 'Plus rapide', ...at, detail: `${kmhText(event.kmh)} sur ${formatRouteDistance(event.meters)} · il a tiré ?` }
    case 'heart':
      return { title: `Votre cœur à ${event.bpm}`, ...at, detail: 'Sans accélérer · un moment de stress ?' }
    case 'retour':
      return { title: 'Retour', ...at }
  }
}

const opt = (detail: string | undefined) => (detail ? { detail } : {})

/** Ce que la fiche montre de la frise : les 5 premières lignes, puis « Voir toute la balade ». */
export const TIMELINE_PREVIEW = 5
