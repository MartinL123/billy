import { parisMinutes } from './activity'
import { formatDuration } from './balade'
import { distanceMeters } from './community'
import { formatDayHeading, type ISODate } from './dates'
import { formatRouteDistance, type Route, type RoutePoint } from './route'
import type { Track } from './track'
import { effectiveTrack, trimWindow } from './trim'
import { walkSourceLabel } from './walkSource'
import { movingSeconds, paceCategory, positionAt, type PaceCategory } from './walkStory'

// La fiche de balade (spec V6 § 6.1) : ce qui s’affiche et comment, calculé ici (fonctions pures, testées).
// Le composant ne fait que mettre en page.

/** « 8 h 12 », « 8 h 05 », « 19 h » (minutes depuis minuit). */
export function clockLabel(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const min = m % 60
  return min ? `${h} h ${String(min).padStart(2, '0')}` : `${h} h`
}

/** L’heure (Paris) `offsetS` secondes après `startTime`. */
export const clockAt = (startTime: string, offsetS: number) => clockLabel(parisMinutes(new Date(Date.parse(startTime) + offsetS * 1000).toISOString()))

const validTime = (time: string | undefined) => (time && !Number.isNaN(Date.parse(time)) ? time : undefined)

/** « Jeudi 22 octobre · 8 h 12 → 8 h 44 · Vertbois » : seulement ce qu’on sait. */
export function walkSubtitle({ date, startTime, endTime, commune, trimmed }: { date: ISODate; startTime?: string; endTime?: string; commune?: string; trimmed?: { startS: number; endS: number } }): string {
  const start = validTime(startTime)
  const end = validTime(endTime)
  // Recadrée (§ 8.3) : les heures de la portion gardée.
  const hours = start ? (trimmed ? `${clockAt(start, trimmed.startS)} → ${clockAt(start, trimmed.endS)}` : end ? `${clockAt(start, 0)} → ${clockAt(end, 0)}` : clockAt(start, 0)) : ''
  return [formatDayHeading(date), hours, commune ?? ''].filter(Boolean).join(' · ')
}

/** La durée de la balade en secondes : début → fin, sinon le trajet daté, sinon la durée notée. */
export function walkSeconds(route: Pick<Route, 'startTime' | 'endTime' | 'track' | 'durationMin' | 'trimmed'>): number | undefined {
  const window = trimWindow(route)
  if (window) return window[1] - window[0]
  const start = validTime(route.startTime)
  const end = validTime(route.endTime)
  if (start && end && Date.parse(end) > Date.parse(start)) return Math.round((Date.parse(end) - Date.parse(start)) / 1000)
  const t = route.track?.t
  if (t && t.length > 1) return t[t.length - 1]! - t[0]!
  return route.durationMin ? route.durationMin * 60 : undefined
}

/** « 45 s », « 32 min », « 1 h 05 ». */
export const durationText = (seconds: number) => (seconds < 60 ? `${Math.round(seconds)} s` : formatDuration(Math.round(seconds / 60)))

/** « 4,2 km/h » */
export const kmhText = (kmh: number) => `${kmh.toFixed(1).replace('.', ',')} km/h`

/** Les chiffres de la fiche (composant Stats) : durée · distance · en marche · arrêts, seulement ce qu’on sait. */
export function sheetStats(route: Route): { value: string; label: string; spoken?: string }[] {
  const seconds = walkSeconds(route)
  const track = effectiveTrack(route)
  const moving = track && route.stops ? movingSeconds(track, route.stops) : undefined
  return [
    { value: seconds ? durationText(seconds) : '', label: 'Durée' },
    { value: formatRouteDistance(route.distanceM), label: 'Distance' },
    { value: moving !== undefined ? durationText(moving) : '', label: 'En marche' },
    { value: route.stops ? String(route.stops.length) : '', label: route.stops?.length === 1 ? 'Arrêt' : 'Arrêts' },
  ]
}

/** L’allure moyenne en marche (km/h, 1 décimale), arrêts retirés quand on les connaît. */
export function averageKmh(route: Route): number | undefined {
  const track = effectiveTrack(route)
  const seconds = track && route.stops ? movingSeconds(track, route.stops) : walkSeconds(route)
  if (!seconds || route.distanceM <= 0) return undefined
  return Math.round((route.distanceM / seconds) * 3.6 * 10) / 10
}

export interface Split {
  /** 1 pour le premier kilomètre. */
  km: number
  seconds: number
  /** Le dernier bout, moins d’un kilomètre : sa longueur. */
  meters?: number
}

/** Le km par km : le temps de chaque kilomètre sur le trajet daté ; le dernier bout s’il fait au moins 100 m. */
export function kmSplits(track: Track): Split[] {
  const out: Split[] = []
  let total = 0
  let lastCut = track.t[0] ?? 0
  for (let i = 1; i < track.t.length; i++) {
    const step = distanceMeters({ lat: track.lat[i - 1]!, lng: track.lng[i - 1]! }, { lat: track.lat[i]!, lng: track.lng[i]! })
    while (total + step >= (out.length + 1) * 1000 && step > 0) {
      // Le passage du kilomètre, au prorata entre les deux points.
      const k = ((out.length + 1) * 1000 - total) / step
      const at = track.t[i - 1]! + k * (track.t[i]! - track.t[i - 1]!)
      out.push({ km: out.length + 1, seconds: Math.round(at - lastCut) })
      lastCut = at
    }
    total += step
  }
  const rest = total - out.length * 1000
  if (rest >= 100) out.push({ km: out.length + 1, seconds: Math.round(track.t[track.t.length - 1]! - lastCut), meters: Math.round(rest / 10) * 10 })
  return out
}

/** « 1er km », « 2e km », « Fin · 340 m » */
export const splitLabel = (s: Split) => (s.meters !== undefined ? `Fin · ${formatRouteDistance(s.meters)}` : s.km === 1 ? '1er km' : `${s.km}e km`)

/** « 12 min 30 » : le temps d’un kilomètre. */
export function splitTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m ? `${m} min ${String(s).padStart(2, '0')}` : `${s} s`
}

/** Cœur moyen et maximum (bpm). */
export function hrSummary(hr: number[] | undefined): { avg: number; max: number; min: number } | undefined {
  const values = (hr ?? []).filter((v) => Number.isFinite(v) && v > 0)
  if (!values.length) return undefined
  return { avg: Math.round(values.reduce((s, v) => s + v, 0) / values.length), max: Math.max(...values), min: Math.min(...values) }
}

export const PACE_LABELS: Record<PaceCategory, string> = { tranquille: 'marche tranquille', rapide: 'rapide', arret: 'arrêt' }

/** Les minutes passées dans chaque allure : le résumé lu par VoiceOver (« 24 min de marche tranquille… »). */
export function paceSummary(pace: number[]): string {
  const minutes: Record<PaceCategory, number> = { tranquille: 0, rapide: 0, arret: 0 }
  for (const kmh of pace) minutes[paceCategory(kmh)]++
  const parts = (['tranquille', 'rapide', 'arret'] as const).filter((c) => minutes[c]).map((c) => `${minutes[c]} min ${c === 'tranquille' ? 'de marche tranquille' : c === 'rapide' ? 'rapide' : 'à l’arrêt'}`)
  return parts.length ? `Allure minute par minute : ${parts.join(', ')}.` : ''
}

/** Une portion du tracé de la même allure : sa couleur sur la carte. */
export interface PaceSegment {
  category: PaceCategory
  points: RoutePoint[]
}

/**
 * Le tracé coloré par allure (§ 3) : les minutes qui se suivent dans la même catégorie font une portion ; chaque
 * portion reprend le dernier point de la précédente (le trait ne se coupe pas).
 */
export function paceSegments(track: Track, pace: number[]): PaceSegment[] {
  const t0 = track.t[0] ?? 0
  const end = track.t[track.t.length - 1] ?? 0
  const out: PaceSegment[] = []
  pace.forEach((kmh, m) => {
    const from = t0 + m * 60
    if (from >= end) return
    const to = Math.min(end, from + 60)
    const inside = track.t.flatMap((t, i): RoutePoint[] => (t > from && t < to ? [[track.lat[i]!, track.lng[i]!]] : []))
    const a = positionAt(track, from)
    const b = positionAt(track, to)
    const points: RoutePoint[] = [[a.lat, a.lng], ...inside, [b.lat, b.lng]]
    const category = paceCategory(kmh)
    const last = out[out.length - 1]
    if (last && last.category === category) last.points.push(...points.slice(1))
    else out.push({ category, points })
  })
  return out
}

/** Ce que montre le doigt posé sur la courbe d’allure : l’heure, la vitesse, la rue (si un arrêt ou un repère proche la connaît). */
export function paceAt(route: Route, minute: number): { clock?: string; kmh: number; category: PaceCategory; street?: string; at: { lat: number; lng: number } } | undefined {
  const pace = route.pace ?? []
  const track = effectiveTrack(route)
  if (!track || minute < 0 || minute >= pace.length) return undefined
  const t0 = track.t[0] ?? 0
  const s = Math.min(t0 + minute * 60 + 30, track.t[track.t.length - 1] ?? 0)
  const at = positionAt(track, s)
  const during = route.stops?.find((stop) => stop.street && stop.at <= t0 + (minute + 1) * 60 && stop.at + stop.durS >= t0 + minute * 60)
  const near = [...(route.stops ?? []), ...route.moments].filter((p) => p.street).map((p) => ({ street: p.street!, d: distanceMeters(at, p) })).filter((p) => p.d <= STREET_NEAR_M).sort((a, b) => a.d - b.d)[0]
  const street = during?.street ?? near?.street
  const start = validTime(route.startTime)
  const kmh = pace[minute]!
  return { ...(start ? { clock: clockAt(start, s - 30) } : {}), kmh, category: paceCategory(kmh), ...(street ? { street } : {}), at }
}

/** La rue d’un point de la courbe : celle d’un arrêt ou d’un repère à moins de 150 m (pas de requête de plus). */
export const STREET_NEAR_M = 150

/** D’où viennent les chiffres (sources en 12 px). `track` : l’étiquette de la liste (R-092), « Watch », « iPhone »… */
export function sourceLabels(route: Pick<Route, 'source' | 'weather' | 'hr' | 'steps' | 'energyKcal' | 'stops' | 'moments'>, entrySource?: string): { track?: string; health?: string; weather?: string; places?: string } {
  const track = walkSourceLabel(entrySource, route.source)
  const fromHealth = Boolean(route.hr?.length || route.steps || route.energyKcal)
  const health = fromHealth ? (route.source === 'watch' ? 'Apple Watch' : route.source === 'gps' ? 'Santé (Apple Watch)' : 'Fichier') : undefined
  const weather = route.weather ? (route.weather.source === 'watch' ? 'Météo : Apple Watch' : 'Météo : Open-Meteo') : undefined
  const places = route.stops?.some((s) => s.street) || route.moments.some((m) => m.street) ? 'Lieux © OpenStreetMap' : undefined
  return { track, ...(health ? { health } : {}), ...(weather ? { weather } : {}), ...(places ? { places } : {}) }
}

/** « 14 °C » ou « 14 °C · 80 % d’humidité » */
export function weatherText(w: Route['weather']): string | undefined {
  if (!w) return undefined
  const temp = `${Math.round(w.tempC)} °C`
  return w.humidity !== undefined ? `${temp} · ${w.humidity} % d’humidité` : temp
}

/** Les arrêts qui attendent encore un repère (ou dont le repère est « À raconter », T-086). */
export const untoldStops = (route: Pick<Route, 'stops'> & { moments?: Route['moments'] }) => (route.stops ?? []).filter((s) => s.momentIndex === undefined || route.moments?.[s.momentIndex]?.type === 'araconter')

const RECORDED_BY: Record<ReturnType<typeof walkSourceLabel>, string> = { Watch: 'Enregistré par l’Apple Watch', iPhone: 'Enregistré par l’iPhone', Fichier: 'Importé d’un fichier', Notée: 'Tracé à la main' }

/**
 * T-102 : la ligne des sources, en bas de la fiche : « Enregistré par l’Apple Watch · Météo Open-Meteo · Lieux ©
 * OpenStreetMap ». Le nom du propriétaire n’est pas connu ici : il n’est pas écrit.
 */
export function sourceLine(route: Pick<Route, 'source' | 'weather' | 'hr' | 'steps' | 'energyKcal' | 'stops' | 'moments' | 'streets' | 'places'>, entrySource?: string): string {
  const src = sourceLabels(route, entrySource)
  const parts = [RECORDED_BY[walkSourceLabel(entrySource, route.source)]]
  // Une balade du GPS de l’iPhone avec la Watch au poignet : le cœur et les pas viennent de Santé.
  if (src.health && src.health !== 'Apple Watch' && src.health !== 'Fichier') parts.push(`Cœur et pas : ${src.health}`)
  const w = route.weather
  if (w) {
    const extra = w.feelsC !== undefined || w.windKmh !== undefined || w.rainMm !== undefined || w.daylight !== undefined
    parts.push(w.source === 'watch' ? (extra ? 'Météo Apple Watch et Open-Meteo' : 'Météo Apple Watch') : 'Météo Open-Meteo')
  }
  if (src.places || route.streets?.length || route.places?.length) parts.push('Lieux © OpenStreetMap')
  return parts.join(' · ')
}
