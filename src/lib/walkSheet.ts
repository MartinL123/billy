import { parisMinutes } from './activity'
import { formatDuration } from './balade'
import type { Commune } from './commune'
import { distanceMeters } from './community'
import { formatDayHeading, type ISODate } from './dates'
import { discoveredShare, inPolygon, revealedCells } from './fog'
import { ofName } from './gender'
import { formatRouteDistance, type Route, type RoutePoint } from './route'
import type { Track } from './track'
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
export function walkSubtitle({ date, startTime, endTime, commune }: { date: ISODate; startTime?: string; endTime?: string; commune?: string }): string {
  const start = validTime(startTime)
  const end = validTime(endTime)
  const hours = start ? (end ? `${clockAt(start, 0)} → ${clockAt(end, 0)}` : clockAt(start, 0)) : ''
  return [formatDayHeading(date), hours, commune ?? ''].filter(Boolean).join(' · ')
}

/** La durée de la balade en secondes : début → fin, sinon le trajet daté, sinon la durée notée. */
export function walkSeconds(route: Pick<Route, 'startTime' | 'endTime' | 'track' | 'durationMin'>): number | undefined {
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
  const moving = route.track && route.stops ? movingSeconds(route.track, route.stops) : undefined
  return [
    { value: seconds ? durationText(seconds) : '', label: 'Durée' },
    { value: formatRouteDistance(route.distanceM), label: 'Distance' },
    { value: moving !== undefined ? durationText(moving) : '', label: 'En marche' },
    { value: route.stops ? String(route.stops.length) : '', label: route.stops?.length === 1 ? 'Arrêt' : 'Arrêts' },
  ]
}

/** L’allure moyenne en marche (km/h, 1 décimale), arrêts retirés quand on les connaît. */
export function averageKmh(route: Route): number | undefined {
  const seconds = route.track && route.stops ? movingSeconds(route.track, route.stops) : walkSeconds(route)
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
  const track = route.track
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

/** Ce que la balade a découvert : les cases jamais vues avant elle, et ce que ça fait de sa commune. */
export interface Discovery {
  newCells: number
  share?: number
  commune?: string
}

type WalkLike = { id: string; date: ISODate; createdAt?: string; route?: { points?: { lat: number; lng: number }[]; startTime?: string } }

const walkOrder = (w: WalkLike) => `${w.date}|${w.route?.startTime ?? ''}|${w.createdAt ?? ''}`

/**
 * Les cases que cette balade a sorties du brouillard : celles de son tracé qu’aucune balade d’avant (date, heure de
 * départ) n’avait déjà levées. Recalculé à partir des tracés : rien de plus n’est enregistré.
 */
export function walkDiscovery(walkId: string, walks: WalkLike[], communes: Commune[]): Discovery | undefined {
  const walk = walks.find((w) => w.id === walkId)
  const points = walk?.route?.points ?? []
  if (!walk || points.length < 2) return undefined
  const key = walkOrder(walk)
  const before = new Set<string>()
  for (const w of walks) {
    if (w.id === walkId || !w.route?.points?.length || walkOrder(w) > key) continue
    for (const cell of revealedCells(w.route.points)) before.add(cell)
  }
  const fresh = [...revealedCells(points)].filter((c) => !before.has(c))
  const commune = communes.find((c) => inPolygon(points[0]!, c.ring))
  return { newCells: fresh.length, ...(commune ? { share: discoveredShare(fresh, commune), commune: commune.name } : {}) }
}

/** « +2 % », « < 1 % » (un peu, pas 1 %), rien si rien de nouveau. */
export function shareGain(share: number | undefined): string | undefined {
  if (!share || share <= 0) return undefined
  return share < 0.01 ? '< 1 %' : `+${Math.round(share * 100)} %`
}

/** « +1 % de Vertbois », « Un peu plus de Vertbois » (moins de 1 %). */
export function discoveryLine(d: Discovery | undefined): string | undefined {
  if (!d || !d.newCells) return undefined
  if (!d.commune || !d.share) return undefined
  return d.share < 0.01 ? `Un peu plus ${ofName(d.commune)} découvert` : `+${Math.round(d.share * 100)} % ${ofName(d.commune)} découvert`
}

/** Un « bout de territoire » : 40 cases de 25 m (le même compte que la balade en cours). */
export const CELLS_PER_BIT = 40

/** La phrase du récap et de « Ce qu’il a découvert » : « Billy a découvert 3 nouveaux bouts de territoire ». */
export function discoverySentence(dogName: string, newCells: number): string {
  const bits = Math.floor(newCells / CELLS_PER_BIT)
  if (bits > 1) return `${dogName} a découvert ${bits} nouveaux bouts de territoire`
  if (bits === 1) return `${dogName} a découvert un nouveau bout de territoire`
  if (newCells > 0) return `${dogName} a agrandi un peu son territoire`
  return `Une balade sur des chemins qu’il connaît`
}

/** D’où viennent les chiffres (sources en 12 px). */
export function sourceLabels(route: Pick<Route, 'source' | 'weather' | 'hr' | 'steps' | 'energyKcal' | 'stops' | 'moments'>): { track?: string; health?: string; weather?: string; places?: string } {
  const track = route.source === 'watch' ? 'Enregistré par l’Apple Watch' : route.source === 'gps' ? 'Enregistré par le GPS de l’iPhone' : route.source === 'gpx' ? 'Importé d’un fichier GPX' : undefined
  const fromHealth = Boolean(route.hr?.length || route.steps || route.energyKcal)
  const health = fromHealth ? (route.source === 'watch' ? 'Apple Watch' : route.source === 'gps' ? 'Santé (Apple Watch)' : 'Fichier GPX') : undefined
  const weather = route.weather ? (route.weather.source === 'watch' ? 'Météo : Apple Watch' : 'Météo : Open-Meteo') : undefined
  const places = route.stops?.some((s) => s.street) || route.moments.some((m) => m.street) ? 'Lieux © OpenStreetMap' : undefined
  return { ...(track ? { track } : {}), ...(health ? { health } : {}), ...(weather ? { weather } : {}), ...(places ? { places } : {}) }
}

/** « 14 °C » ou « 14 °C · 80 % d’humidité » */
export function weatherText(w: Route['weather']): string | undefined {
  if (!w) return undefined
  const temp = `${Math.round(w.tempC)} °C`
  return w.humidity !== undefined ? `${temp} · ${w.humidity} % d’humidité` : temp
}

/** Les arrêts qui attendent encore un repère : « Raconter la balade » n’apparaît que s’il en reste. */
export const untoldStops = (route: Pick<Route, 'stops'>) => (route.stops ?? []).filter((s) => s.momentIndex === undefined)
