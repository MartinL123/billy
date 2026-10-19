import type { Activity } from './activity'
import { walkDistance } from './activity'
import { watchName, type WatchWalk } from './watch'

// La balade enregistrée par l'iPhone (app iOS, T-036) : démarrée et arrêtée par ses boutons, puis le même circuit que
// l'import d'un fichier GPX. Ce fichier ne dépend ni de Capacitor ni de Firestore.

export interface GpsPoint {
  lat: number
  lng: number
  time: string
}

/** En dessous de 100 m ou de 2 minutes, la balade n'est pas gardée (un départ par erreur). */
export const MIN_DISTANCE_M = 100
export const MIN_DURATION_MS = 2 * 60 * 1000

/** Au-delà de 3 h, l'enregistrement s'arrête seul (même règle que `FlairNativePlugin.swift`). */
export const MAX_WALK_MS = 3 * 3600 * 1000

/** Durée écoulée depuis le départ, en millisecondes (jamais négative). */
export const elapsedMs = (startedAt: string, now: number) => Math.max(0, now - Date.parse(startedAt))

/** Le chrono : « 4:07 », « 23:05 », « 1:02:09 ». */
export function chrono(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`
}

/** « 23 min », « 1 h 05 » (la carte « Balade en cours »). */
export function minutesSince(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`
}

/** La distance parcourue, en mètres (mêmes règles que l'import : les sauts du GPS à l'arrêt ne comptent pas). */
export const gpsDistance = (points: GpsPoint[]) => walkDistance(points)

/** Trop courte pour être gardée ? */
export function tooShort(points: GpsPoint[], startedAt: string, endedAt: number): boolean {
  return gpsDistance(points) < MIN_DISTANCE_M || elapsedMs(startedAt, endedAt) < MIN_DURATION_MS
}

/** La balade terminée devient une activité, comme un fichier GPX lu (nom selon l'heure de départ). */
export function gpsActivity(points: GpsPoint[], startedAt: string): Activity {
  return { name: watchName(startedAt, 'walking'), type: 'walking', points: points.map((p) => ({ lat: p.lat, lng: p.lng, time: p.time })) }
}

/** Part de la séance Watch couverte par une balade de l'iPhone (0 à 1). */
export function overlapShare(watch: { start: string; end: string }, gps: { start: string; end: string }): number {
  const ws = Date.parse(watch.start)
  const we = Date.parse(watch.end)
  const overlap = Math.min(we, Date.parse(gps.end)) - Math.max(ws, Date.parse(gps.start))
  return we > ws && overlap > 0 ? overlap / (we - ws) : 0
}

/**
 * Doublon Watch + iPhone : une séance Watch couverte à plus de la moitié par une balade enregistrée par l'iPhone est
 * ignorée (la balade de l'iPhone est gardée).
 */
export function withoutGpsDuplicates(walks: WatchWalk[], known: { source?: string; route?: { source?: string; startTime?: string; endTime?: string } }[]): WatchWalk[] {
  const gps = known.flatMap((k) => (k.route?.source === 'gps' && k.route.startTime && k.route.endTime ? [{ start: k.route.startTime, end: k.route.endTime }] : []))
  return walks.filter((w) => !gps.some((g) => overlapShare(w, g) > 0.5))
}
