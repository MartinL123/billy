import type { Activity } from './activity'
import { walkDistance } from './activity'
import { healthFields, timedPoint, watchName, type WatchWalk } from './watch'
import type { HealthExtras } from './walkHealth'
import { formatDuration } from './balade'
import { formatRouteDistance } from './route'

// La balade enregistrée par l'iPhone (app iOS, T-036) : démarrée et arrêtée par ses boutons, puis le même circuit que
// l'import d'un fichier GPX. Ce fichier ne dépend ni de Capacitor ni de Firestore.

export interface GpsPoint {
  lat: number
  lng: number
  time: string
  /** V6 § 2.1 : altitude (m), vitesse (m/s) et précision (m) du GPS, si iOS les donne. */
  alt?: number
  speed?: number
  accuracy?: number
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
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes}\u00a0min`
}

/** La distance parcourue, en mètres (mêmes règles que l'import : les sauts du GPS à l'arrêt ne comptent pas). */
export const gpsDistance = (points: GpsPoint[]) => walkDistance(points)

/** Trop courte pour être gardée ? */
export function tooShort(points: GpsPoint[], startedAt: string, endedAt: number): boolean {
  return gpsDistance(points) < MIN_DISTANCE_M || elapsedMs(startedAt, endedAt) < MIN_DURATION_MS
}

/**
 * La balade terminée devient une activité, comme un fichier GPX lu (nom selon l'heure de départ). `health` : le cœur,
 * les pas et l’énergie lus dans Santé sur la même fenêtre (Watch au poignet), s’il y en a (V6 § 2.2).
 */
export function gpsActivity(points: GpsPoint[], startedAt: string, health?: HealthExtras): Activity {
  return { name: watchName(startedAt, 'walking'), type: 'walking', points: points.map(timedPoint), ...healthFields(health) }
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

// ——— V5 (T-051) : l’écran « Balade en cours » ———

/** « 15 min 17 s » : les minutes en grand, les secondes plus petites (plus de « 15:17 »). */
export function durationParts(ms: number): { min: number; sec: number } {
  const total = Math.max(0, Math.floor(ms / 1000))
  return { min: Math.floor(total / 60), sec: total % 60 }
}

/** Le GPS est faible : précision moins bonne que 50 m depuis plus de 20 s. */
export const WEAK_ACCURACY_M = 50
export const WEAK_AFTER_MS = 20_000
export function weakSignal(lastAccuracy: number | undefined, weakSince: number | undefined, now: number): boolean {
  return lastAccuracy !== undefined && lastAccuracy > WEAK_ACCURACY_M && weakSince !== undefined && now - weakSince > WEAK_AFTER_MS
}

/** Deux points à plus de 20 s d’écart : la portion entre les deux est douteuse (tracé en pointillés). */
export function doubtfulSegments(points: GpsPoint[]): [number, number][] {
  const out: [number, number][] = []
  for (let i = 1; i < points.length; i++) if (Date.parse(points[i]!.time) - Date.parse(points[i - 1]!.time) > WEAK_AFTER_MS) out.push([i - 1, i])
  return out
}

/** Un « bout de territoire » : 40 cases de 25 m jamais vues (environ 2 500 m²). */
export const CELLS_PER_BIT = 40
export const territoryBits = (newCells: number) => Math.floor(newCells / CELLS_PER_BIT)

/**
 * « Belle balade ! » en chiffres (composant Stats, V6 § 1) : durée, distance, puis les os (seulement s’ils sont donnés)
 * et les nouveaux bouts de territoire (seulement s’il y en a).
 */
export function endWalkStats({ ms, distanceM, noteBones, bits }: { ms: number; distanceM: number; noteBones: number; bits: number }): { value: string; label: string }[] {
  const { min, sec } = durationParts(ms)
  const out = [
    { value: min ? formatDuration(min) : `${sec}\u00a0s`, label: 'Durée' },
    { value: formatRouteDistance(distanceM), label: 'Distance' },
  ]
  if (noteBones > 0) out.push({ value: `+${noteBones}`, label: 'Os gagnés' })
  if (bits > 0) out.push({ value: String(bits), label: bits === 1 ? 'Nouveau bout de territoire' : 'Nouveaux bouts de territoire' })
  return out
}

/**
 * Arrêtée (« Terminer » touché, ou 3 h dépassées) : l’heure de l’arrêt. Une balade interrompue (app fermée) depuis plus
 * de 3 h ne se reprend plus, elle est seulement à enregistrer (R-043, T-062).
 */
export function stoppedAtOf(current: { stopped?: boolean; stoppedAt?: string; recording: boolean; startedAt?: string }, now: number): string | undefined {
  if (current.stopped) return current.stoppedAt ?? current.startedAt
  if (!current.recording && current.startedAt && now - Date.parse(current.startedAt) > MAX_WALK_MS) return new Date(Date.parse(current.startedAt) + MAX_WALK_MS).toISOString()
  return undefined
}
