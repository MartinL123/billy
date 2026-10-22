import { formatDuration } from './balade'

// T-084 (spec V6 § 4) : une marche de la Watch réveille l'app iOS, qui programme une notification locale. Le texte et
// l'heure sont calculés en Swift (`WatchArrivals` dans `ios/App/App/FlairNativePlugin.swift`), au réveil, sans le JS :
// ce fichier en est le miroir, testé, et sert aussi à retrouver la balade quand on touche la notification.

/** Rien la nuit : de 22 h à 7 h, la notification attend 7 h. */
export const QUIET_FROM = 22
export const QUIET_UNTIL = 7

/** Quand montrer la notification : tout de suite, ou à 7 h si la balade arrive entre 22 h et 7 h (heure de l'iPhone). */
export function arrivalDeliveryDate(now: Date): Date {
  const hour = now.getHours()
  if (hour >= QUIET_UNTIL && hour < QUIET_FROM) return now
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), QUIET_UNTIL, 0, 0, 0)
  if (hour >= QUIET_FROM) at.setDate(at.getDate() + 1)
  return at
}

/** « Belle balade avec Billy ! » */
export const arrivalTitle = (dogName: string) => `Belle balade avec ${dogName.trim() || 'votre chien'} !`

/** « 2,1 km · 32 min. Touchez pour voir ce qu’il a découvert. » (« 850 m » sous le kilomètre). */
export function arrivalBody(distanceM: number, seconds: number): string {
  const distance = distanceM < 1000 ? `${Math.max(10, Math.round(distanceM / 10) * 10)} m` : `${(distanceM / 1000).toFixed(1).replace('.', ',')} km`
  const duration = formatDuration(Math.max(1, Math.round(seconds / 60)))
  return `${distance} · ${duration}. Touchez pour voir ce qu’il a découvert.`
}

/** Le lien ouvert par la notification : `#/balade/arrivee?uuid=…&start=…` (le départ sert à retrouver la balade importée). */
export const arrivalPath = (uuid: string, start: string) => `/balade/arrivee?uuid=${encodeURIComponent(uuid)}&start=${encodeURIComponent(start)}`

/** Même tolérance que les doublons de la Watch (`SAME_START_MS` de `watch.ts`) : 5 minutes. */
const SAME_START_MS = 5 * 60 * 1000

/**
 * La balade importée qui correspond à la séance de la Watch : celle dont le départ est le plus proche (5 min au plus),
 * de la Watch d'abord (une balade de Strava ou du GPS au même moment est la même sortie).
 */
export function findArrivedEntry<T extends { id: string; source?: string; route?: { startTime?: string } }>(entries: T[], start: string): T | undefined {
  const at = Date.parse(start)
  if (Number.isNaN(at)) return undefined
  let best: { entry: T; score: number } | undefined
  for (const entry of entries) {
    const t = entry.route?.startTime ? Date.parse(entry.route.startTime) : NaN
    if (Number.isNaN(t)) continue
    const gap = Math.abs(t - at)
    if (gap >= SAME_START_MS) continue
    const score = gap + (entry.source === 'watch' ? 0 : SAME_START_MS)
    if (!best || score < best.score) best = { entry, score }
  }
  return best?.entry
}
