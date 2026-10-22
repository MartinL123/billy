import { distanceMeters } from './community'
import type { RouteMoment, RouteStop } from './route'
import type { Track } from './track'

// L’histoire d’une balade (spec V6 § 3) : arrêts, allure minute par minute, moment rapide, pic de cœur, temps en
// marche. Fonctions pures, calculées sur le trajet daté (`route.track`) ; toutes acceptent une fenêtre
// [début, fin] en secondes depuis le départ, pour le recadrage (§ 8.3).

/** Arrêt : vitesse lissée sur 15 s sous 0,4 m/s pendant 30 s ou plus, dans un rayon de 25 m. */
export const SMOOTH_S = 15
export const STOP_SPEED = 0.4
export const STOP_MIN_S = 30
export const STOP_RADIUS_M = 25
/** Deux arrêts séparés de moins de 20 s n’en font qu’un. */
export const STOP_MERGE_S = 20
/** Pas d’arrêt dans les 30 premières et dernières secondes (départ et retour). */
export const EDGE_S = 30
/** Entre deux points à plus de 10 s d’écart (GPS immobile ou perdu), la vitesse est la distance sur le temps. */
export const GAP_S = 10
/** Allure : arrêt sous 1,5 km/h, rapide au-dessus de 5,2 km/h. */
export const SLOW_KMH = 1.5
export const FAST_KMH = 5.2
/** Moment rapide : au moins 150 m au-dessus de 5,2 km/h. */
export const FAST_MIN_M = 150
/** Pic de cœur : plus de 20 bpm de plus d’une minute à l’autre, sans accélérer de plus de 1 km/h. */
export const HEART_RISE = 20
export const NO_ACCEL_KMH = 1
/** Un repère à moins de 40 m d’un arrêt s’y rattache. */
export const MOMENT_NEAR_M = 40

export type Window = [startS: number, endS: number]
export type PaceCategory = 'arret' | 'tranquille' | 'rapide'

export interface FastMoment {
  startS: number
  endS: number
  kmh: number
  meters: number
}

export interface HeartPeak {
  atS: number
  bpm: number
}

/** Une pause de la Watch (séance mise en pause), en secondes depuis le départ. */
export interface Pause {
  startS: number
  endS: number
}

const at = (track: Track, i: number) => ({ lat: track.lat[i]!, lng: track.lng[i]! })

/** La fenêtre étudiée : celle demandée, bornée au trajet ; sinon tout le trajet. */
export function windowOf(track: Track, window?: Window): Window {
  const first = track.t[0] ?? 0
  const last = track.t[track.t.length - 1] ?? 0
  if (!window) return [first, last]
  return [Math.max(first, Math.min(window[0], last)), Math.min(last, Math.max(window[1], first))]
}

/**
 * La vitesse (m/s) de chaque seconde de la fenêtre : entre deux points proches, celle du point d’arrivée (le GPS la
 * mesure, ou elle a été calculée depuis le point d’avant) ; au-dessus de 10 s d’écart, la distance sur le temps.
 */
export function secondSpeeds(track: Track, window?: Window): number[] {
  const [a, b] = windowOf(track, window)
  const out: number[] = []
  let i = 0
  for (let s = a; s < b; s++) {
    while (i < track.t.length - 2 && track.t[i + 1]! <= s) i++
    const t0 = track.t[i]!
    const t1 = track.t[i + 1]!
    const dt = t1 - t0
    if (s < t0 || s >= t1 || dt <= 0) {
      out.push(0)
      continue
    }
    const v = track.v?.[i + 1]
    out.push(dt <= GAP_S && v !== undefined ? v : distanceMeters(at(track, i), at(track, i + 1)) / dt)
  }
  return out
}

/** Moyenne glissante centrée sur `width` secondes. */
export function smooth(values: number[], width = SMOOTH_S): number[] {
  const half = Math.floor(width / 2)
  const sums = [0]
  for (const v of values) sums.push(sums[sums.length - 1]! + v)
  return values.map((_, i) => {
    const from = Math.max(0, i - half)
    const to = Math.min(values.length, i + half + 1)
    return (sums[to]! - sums[from]!) / (to - from)
  })
}

/** La position à la seconde `s` (entre deux points, au prorata du temps). */
export function positionAt(track: Track, s: number): { lat: number; lng: number } {
  const n = track.t.length
  if (s <= track.t[0]!) return at(track, 0)
  if (s >= track.t[n - 1]!) return at(track, n - 1)
  let i = 0
  while (track.t[i + 1]! < s) i++
  const k = (s - track.t[i]!) / (track.t[i + 1]! - track.t[i]! || 1)
  return { lat: track.lat[i]! + k * (track.lat[i + 1]! - track.lat[i]!), lng: track.lng[i]! + k * (track.lng[i + 1]! - track.lng[i]!) }
}

/** Les positions d’une portion : ses deux bouts et les points du trajet entre les deux. */
function positionsBetween(track: Track, start: number, end: number) {
  const inside = track.t.flatMap((t, i) => (t > start && t < end ? [at(track, i)] : []))
  return [positionAt(track, start), ...inside, positionAt(track, end)]
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5

/** Les portions (en secondes depuis le départ, fin exclue) où `test` est vrai, seconde par seconde. */
function runs(values: number[], from: number, test: (v: number, i: number) => boolean): [number, number][] {
  const out: [number, number][] = []
  let start = -1
  values.forEach((v, i) => {
    if (test(v, i)) {
      if (start < 0) start = i
    } else if (start >= 0) {
      out.push([from + start, from + i])
      start = -1
    }
  })
  if (start >= 0) out.push([from + start, from + values.length])
  return out
}

/**
 * Les arrêts (V6 § 3). La vitesse lissée repère les arrêts, la vitesse brute en donne les bords exacts. Les pauses de la
 * Watch comptent comme arrêts (sans contrôle du rayon : le GPS est coupé pendant une pause).
 */
export function findStops(track: Track, { window, pauses = [] }: { window?: Window; pauses?: Pause[] } = {}): RouteStop[] {
  const [a, b] = windowOf(track, window)
  const raw = secondSpeeds(track, [a, b])
  const smoothed = smooth(raw)
  const slow = (i: number) => i >= 0 && i < raw.length && raw[i]! < STOP_SPEED
  const found = runs(smoothed, a, (v) => v < STOP_SPEED).map(([start, end]): [number, number, boolean] => {
    let s = start - a
    let e = end - a
    while (slow(s - 1)) s--
    while (slow(e)) e++
    return [a + s, a + e, false]
  })
  for (const p of pauses) {
    const start = Math.max(a, p.startS)
    const end = Math.min(b, p.endS)
    if (end > start) found.push([start, end, true])
  }
  found.sort((x, y) => x[0] - y[0])
  const merged: [number, number, boolean][] = []
  for (const run of found) {
    const last = merged[merged.length - 1]
    if (last && run[0] - last[1] < STOP_MERGE_S) {
      last[1] = Math.max(last[1], run[1])
      last[2] ||= run[2]
    } else merged.push([...run])
  }
  const stops: RouteStop[] = []
  for (const [start, end, paused] of merged) {
    if (end - start < STOP_MIN_S || start < a + EDGE_S || end > b - EDGE_S) continue
    const positions = positionsBetween(track, start, end)
    const center = { lat: positions.reduce((s, p) => s + p.lat, 0) / positions.length, lng: positions.reduce((s, p) => s + p.lng, 0) / positions.length }
    if (!paused && positions.some((p) => distanceMeters(p, center) > STOP_RADIUS_M)) continue
    stops.push({ at: start, durS: end - start, lat: round5(center.lat), lng: round5(center.lng) })
  }
  return stops
}

/** L’allure minute par minute (km/h, 1 décimale) ; la dernière minute, souvent incomplète, sur ce qu’elle a. */
export function paceByMinute(track: Track, window?: Window): number[] {
  const speeds = secondSpeeds(track, window)
  const out: number[] = []
  for (let m = 0; m * 60 < speeds.length; m++) {
    const minute = speeds.slice(m * 60, (m + 1) * 60)
    out.push(Math.round((minute.reduce((s, v) => s + v, 0) / minute.length) * 3.6 * 10) / 10)
  }
  return out
}

/** Arrêt (< 1,5 km/h), tranquille (1,5 à 5,2), rapide (> 5,2). */
export const paceCategory = (kmh: number): PaceCategory => (kmh < SLOW_KMH ? 'arret' : kmh > FAST_KMH ? 'rapide' : 'tranquille')

/** Le moment rapide : la plus longue portion au-dessus de 5,2 km/h (vitesse lissée) sur 150 m ou plus. Un seul. */
export function fastMoment(track: Track, window?: Window): FastMoment | undefined {
  const [a] = windowOf(track, window)
  const raw = secondSpeeds(track, window)
  let best: FastMoment | undefined
  for (const [start, end] of runs(smooth(raw), a, (v) => v * 3.6 > FAST_KMH)) {
    const meters = raw.slice(start - a, end - a).reduce((s, v) => s + v, 0)
    if (meters >= FAST_MIN_M && (!best || meters > best.meters)) best = { startS: start, endS: end, kmh: Math.round((meters / (end - start)) * 3.6 * 10) / 10, meters: Math.round(meters) }
  }
  return best
}

/**
 * Le pic de cœur : `hr` donne une valeur par minute depuis le départ ; une hausse de plus de 20 bpm d’une minute à la
 * suivante (donc en moins d’une minute) alors que l’allure n’a pas augmenté de plus de 1 km/h. Le plus fort, s’il y en
 * a un. Une suggestion seulement (« Votre cœur à 118 »), jamais un moment noté automatiquement.
 */
export function heartPeak(track: Track, hr: number[] | undefined, window?: Window): HeartPeak | undefined {
  if (!hr || hr.length < 2) return undefined
  const [a, b] = windowOf(track, window)
  const kmh = (m: number) => {
    const speeds = secondSpeeds(track, [m * 60, (m + 1) * 60])
    return speeds.length ? (speeds.reduce((s, v) => s + v, 0) / speeds.length) * 3.6 : 0
  }
  let best: (HeartPeak & { rise: number }) | undefined
  for (let m = 1; m < hr.length; m++) {
    if ((m - 1) * 60 < a || m * 60 > b) continue
    const rise = hr[m]! - hr[m - 1]!
    if (rise > HEART_RISE && kmh(m) - kmh(m - 1) <= NO_ACCEL_KMH && (!best || rise > best.rise)) best = { atS: m * 60, bpm: hr[m]!, rise }
  }
  return best && { atS: best.atS, bpm: best.bpm }
}

/** En marche = durée − somme des arrêts (en secondes). */
export function movingSeconds(track: Track, stops: RouteStop[], window?: Window): number {
  const [a, b] = windowOf(track, window)
  return Math.max(0, b - a - stops.reduce((sum, s) => sum + Math.max(0, Math.min(b, s.at + s.durS) - Math.max(a, s.at)), 0))
}

/** Rattache à chaque arrêt le repère le plus proche à moins de 40 m (`momentIndex`), sinon rien. */
export function linkMoments(stops: RouteStop[], moments: Pick<RouteMoment, 'lat' | 'lng'>[]): RouteStop[] {
  return stops.map((stop) => {
    const { momentIndex: _old, ...rest } = stop
    let best = -1
    let bestDistance = MOMENT_NEAR_M
    moments.forEach((m, i) => {
      const d = distanceMeters(stop, m)
      if (d <= bestDistance) {
        best = i
        bestDistance = d
      }
    })
    return best >= 0 ? { ...rest, momentIndex: best } : rest
  })
}

export interface WalkStory {
  stops: RouteStop[]
  pace: number[]
  fast?: FastMoment
  heart?: HeartPeak
  movingS: number
}

/** Toute l’histoire d’une balade, sur la fenêtre gardée (recadrage) s’il y en a une. */
export function walkStory(track: Track, { window, pauses, moments = [], hr }: { window?: Window; pauses?: Pause[]; moments?: Pick<RouteMoment, 'lat' | 'lng'>[]; hr?: number[] } = {}): WalkStory {
  const stops = linkMoments(findStops(track, { window, pauses }), moments)
  const fast = fastMoment(track, window)
  const heart = heartPeak(track, hr, window)
  return { stops, pace: paceByMinute(track, window), ...(fast ? { fast } : {}), ...(heart ? { heart } : {}), movingS: movingSeconds(track, stops, window) }
}

/** Les arrêts et l’allure à enregistrer pour une balade qui a un trajet daté (fenêtre du recadrage comprise). */
export function routeStory(route: { track?: Track; trimmed?: { startS: number; endS: number }; moments?: Pick<RouteMoment, 'lat' | 'lng'>[]; hr?: number[]; pauses?: Pause[] }): Pick<WalkStory, 'stops' | 'pace'> | undefined {
  if (!route.track) return undefined
  const { stops, pace } = walkStory(route.track, { window: route.trimmed ? [route.trimmed.startS, route.trimmed.endS] : undefined, moments: route.moments, hr: route.hr, pauses: route.pauses })
  return { stops, pace }
}

/**
 * Rattrapage (V6 § 3) : une balade qui a un trajet daté mais pas encore ses arrêts ou son allure. Renvoie seulement
 * ce qui manque ; rien n’est jamais recalculé par-dessus ce qui existe (un recadrage le fera, § 8.3).
 */
export function missingStory(route: Parameters<typeof routeStory>[0] & { stops?: RouteStop[]; pace?: number[] }): { stops?: RouteStop[]; pace?: number[] } | undefined {
  if (!route.track || (route.stops && route.pace)) return undefined
  const story = routeStory(route)
  if (!story) return undefined
  return { ...(route.stops ? {} : { stops: story.stops }), ...(route.pace ? {} : { pace: story.pace }) }
}

/** Les arrêts sans rue, à chercher. */
export const stopsWithoutStreet = (stops: RouteStop[] | undefined) => (stops ?? []).filter((s) => !s.street)

/** Ajoute les rues trouvées (par heure d’arrêt) aux arrêts tels qu’ils sont maintenant ; même tableau si rien ne change. */
export function withStreets(stops: RouteStop[], streets: Map<number, string>): RouteStop[] {
  let changed = false
  const out = stops.map((s) => {
    const street = streets.get(s.at)
    if (s.street || !street) return s
    changed = true
    return { ...s, street }
  })
  return changed ? out : stops
}
