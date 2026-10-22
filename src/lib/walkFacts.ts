import { ageAt, formatAge } from './age'
import { distanceMeters } from './community'
import { isValidISO, type ISODate } from './dates'
import { dogName } from './dogName'
import { distanceToRoute, type RoutePoint } from './route'
import type { Track } from './track'
import { effectiveTrack, trimWindow } from './trim'
import { kmSplits, walkSeconds, type Split } from './walkSheet'
import { movingSeconds, secondSpeeds, SLOW_KMH, smooth } from './walkStory'

// T-102 (V6.1 § 7) : tout ce qu’on sait d’une balade, en fonctions pures (testées). Vitesse max, cadence, km par km,
// moment de la journée, rues et lieux traversés, trajet déjà fait, flèches du sens de marche, profil d’altitude.
// Jamais de record, de classement ni de comparaison de performance.

/** Une rue traversée (Nominatim) ; `new` : jamais vue dans une balade précédente. */
export interface RouteStreet {
  name: string
  new?: boolean
}

/** Un parc, un jardin, un square… traversé (Nominatim). */
export type PlaceKind = 'parc' | 'square' | 'jardin' | 'canin' | 'jeux' | 'nature' | 'lieu'
export interface RoutePlace {
  name: string
  kind: PlaceKind
}

/** Le moment de la journée, d’après le lever et le coucher du soleil. */
export type Daylight = 'nuit' | 'lever' | 'jour' | 'coucher'

const round1 = (n: number) => Math.round(n * 10) / 10

// ——— Allure ———

/** Au-delà de 25 km/h, c’est le GPS qui saute (un vélo, une voiture, un point perdu) : ignoré. */
export const MAX_PLAUSIBLE_KMH = 25

/** La vitesse max (km/h, 1 décimale), sur la vitesse lissée sur 15 s : un saut de GPS ne compte pas. */
export function maxSpeedKmh(track: Track): number | undefined {
  let best = 0
  for (const v of smooth(secondSpeeds(track))) {
    const kmh = v * 3.6
    if (kmh <= MAX_PLAUSIBLE_KMH && kmh > best) best = kmh
  }
  return best >= SLOW_KMH ? round1(best) : undefined
}

/** La cadence : pas par minute en marche (arrêts retirés). Rien en dehors de 30 à 220 (donnée douteuse). */
export function cadenceOf(steps: number | undefined, movingS: number | undefined): number | undefined {
  if (!steps || !movingS || movingS < 60) return undefined
  const c = Math.round(steps / (movingS / 60))
  return c >= 30 && c <= 220 ? c : undefined
}

type FigureInput = { track?: Track; trimmed?: { startS: number; endS: number }; stops?: { at: number; durS: number; lat: number; lng: number }[]; steps?: number; startTime?: string; endTime?: string; durationMin?: number }

/** Les chiffres gardés avec la balade : km par km (secondes de chaque kilomètre entier), vitesse max, cadence. */
export function walkFigures(route: FigureInput): { kmSplits?: number[]; maxSpeed?: number; cadence?: number } {
  const track = effectiveTrack(route)
  const splits = track ? kmSplits(track).filter((s) => s.meters === undefined).map((s) => s.seconds) : []
  const max = track ? maxSpeedKmh(track) : undefined
  const moving = route.track && route.stops ? movingSeconds(route.track, route.stops, trimWindow(route)) : walkSeconds(route)
  const cadence = cadenceOf(route.steps, moving)
  return { ...(splits.length ? { kmSplits: splits } : {}), ...(max ? { maxSpeed: max } : {}), ...(cadence ? { cadence } : {}) }
}

/** Rattrapage : seulement les chiffres qui manquent et qu’on sait calculer. */
export function missingFigures(route: FigureInput & { kmSplits?: number[]; maxSpeed?: number; cadence?: number }): { kmSplits?: number[]; maxSpeed?: number; cadence?: number } | undefined {
  const all = walkFigures(route)
  const out = {
    ...(route.kmSplits === undefined && all.kmSplits ? { kmSplits: all.kmSplits } : {}),
    ...(route.maxSpeed === undefined && all.maxSpeed ? { maxSpeed: all.maxSpeed } : {}),
    ...(route.cadence === undefined && all.cadence ? { cadence: all.cadence } : {}),
  }
  return Object.keys(out).length ? out : undefined
}

// ——— Le moment de la journée ———

/** 30 min autour du lever ou du coucher : « au lever du soleil », « au coucher du soleil ». */
export const TWILIGHT_MS = 30 * 60_000

/** Une balade qui touche la demi-heure autour du coucher (ou du lever) ; sinon de jour ou de nuit, selon son milieu. */
export function daylightMoment(startMs: number, endMs: number | undefined, sunriseMs: number, sunsetMs: number): Daylight {
  const end = endMs !== undefined && endMs > startMs ? endMs : startMs
  const touches = (c: number) => startMs <= c + TWILIGHT_MS && end >= c - TWILIGHT_MS
  if (touches(sunsetMs)) return 'coucher'
  if (touches(sunriseMs)) return 'lever'
  const mid = (startMs + end) / 2
  return mid > sunriseMs && mid < sunsetMs ? 'jour' : 'nuit'
}

export const DAYLIGHT_LABELS: Record<Daylight, string> = { nuit: 'De nuit', lever: 'Au lever du soleil', jour: 'En plein jour', coucher: 'Au coucher du soleil' }

// ——— Rues et lieux ———

/** Un point toutes les 100 m (le premier et le dernier compris), 60 au plus : l’écart grandit sur les longues balades. */
export const STREET_EVERY_M = 100
export const STREET_MAX_POINTS = 60

export function samplePoints(points: RoutePoint[], everyM = STREET_EVERY_M, max = STREET_MAX_POINTS): RoutePoint[] {
  if (points.length < 2) return points.slice()
  const cum = [0]
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1]! + distanceMeters({ lat: points[i - 1]![0], lng: points[i - 1]![1] }, { lat: points[i]![0], lng: points[i]![1] }))
  const total = cum[cum.length - 1]!
  const step = Math.max(everyM, total / Math.max(1, max - 1))
  const out: RoutePoint[] = [points[0]!]
  let i = 1
  for (let d = step; d < total - step / 2; d += step) {
    while (cum[i]! < d) i++
    const k = (d - cum[i - 1]!) / (cum[i]! - cum[i - 1]! || 1)
    const a = points[i - 1]!
    const b = points[i]!
    out.push([Math.round((a[0] + k * (b[0] - a[0])) * 1e5) / 1e5, Math.round((a[1] + k * (b[1] - a[1])) * 1e5) / 1e5])
  }
  out.push(points[points.length - 1]!)
  return out.slice(0, max)
}

const key = (name: string) => name.trim().toLocaleLowerCase('fr')

/** Les rues dans l’ordre du passage, chacune une fois (la première fois qu’on y passe). */
export function streetSequence(names: (string | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const name = raw?.trim()
    if (!name || seen.has(key(name))) continue
    seen.add(key(name))
    out.push(name)
  }
  return out
}

/** Les lieux traversés, chacun une fois, dans l’ordre. */
export function placeSequence(places: (RoutePlace | undefined)[]): RoutePlace[] {
  const seen = new Set<string>()
  const out: RoutePlace[] = []
  for (const p of places) {
    const name = p?.name.trim()
    if (!p || !name || seen.has(key(name))) continue
    seen.add(key(name))
    out.push({ name, kind: p.kind })
  }
  return out
}

/** Le moment d’une balade, pour l’ordre : son départ, sinon midi le jour de sa date. */
export const walkMs = (w: { date: ISODate; startTime?: string }) => {
  const start = w.startTime ? Date.parse(w.startTime) : NaN
  return Number.isNaN(start) ? Date.parse(`${w.date}T12:00:00Z`) : start
}

type WalkRef = { id: string; date: ISODate; startTime?: string }

/** Les rues déjà vues dans les balades d’avant (par date de départ). */
export function streetsBefore(walks: (WalkRef & { streets?: RouteStreet[] })[], current: WalkRef): Set<string> {
  const at = walkMs(current)
  const out = new Set<string>()
  for (const w of walks) if (w.id !== current.id && walkMs(w) < at) for (const s of w.streets ?? []) out.add(key(s.name))
  return out
}

/** Les rues d’une balade, « nouvelle » si jamais vue avant. */
export function markNewStreets(names: string[], before: Set<string>): RouteStreet[] {
  return names.map((name) => (before.has(key(name)) ? { name } : { name, new: true }))
}

// ——— Le même trajet ———

/** Deux trajets « presque identiques » : 80 % des points de chacun à moins de 30 m de l’autre. */
export const SAME_ROUTE_M = 30
export const SAME_ROUTE_SHARE = 0.8
const RESAMPLE_M = 25

function bbox(points: RoutePoint[]) {
  let [s, w, n, e] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [lat, lng] of points) {
    s = Math.min(s, lat)
    n = Math.max(n, lat)
    w = Math.min(w, lng)
    e = Math.max(e, lng)
  }
  return { s, w, n, e }
}

/** La part des points de `a` (un tous les 25 m) à moins de `tol` m du tracé `b` ; s’arrête dès que le seuil est manqué. */
function nearShare(a: RoutePoint[], b: RoutePoint[], tol: number, need: number): number {
  const pts = samplePoints(a, RESAMPLE_M, 400)
  const allowed = Math.floor(pts.length * (1 - need))
  let miss = 0
  for (const [lat, lng] of pts) {
    if (distanceToRoute({ lat, lng }, b) > tol && ++miss > allowed) return 0
  }
  return 1 - miss / pts.length
}

export function sameRoute(a: RoutePoint[], b: RoutePoint[], tol = SAME_ROUTE_M, share = SAME_ROUTE_SHARE): boolean {
  if (a.length < 2 || b.length < 2) return false
  const A = bbox(a)
  const B = bbox(b)
  const dLat = tol / 111_195
  const dLng = dLat / Math.cos((A.s * Math.PI) / 180)
  if (A.s > B.n + dLat || B.s > A.n + dLat || A.w > B.e + dLng || B.w > A.e + dLng) return false
  return nearShare(a, b, tol, share) >= share && nearShare(b, a, tol, share) >= share
}

/** Combien de fois on est déjà passé par ce trajet avant cette balade (« Vous êtes déjà passés ici 4 fois »). */
export function timesBefore(current: WalkRef & { points: RoutePoint[] }, walks: (WalkRef & { points: RoutePoint[] })[]): number {
  const at = walkMs(current)
  return walks.filter((w) => w.id !== current.id && walkMs(w) < at && sameRoute(current.points, w.points)).length
}

/** « Vous êtes déjà passés ici une fois », « … 4 fois » ; rien la première fois. */
export const timesBeforeText = (n: number) => (n <= 0 ? undefined : `Vous êtes déjà passés ici ${n === 1 ? 'une fois' : `${n} fois`}`)

// ——— La carte et le relief ———

/** Les flèches du sens de marche : une au milieu de chaque tranche de 250 m (8 au plus), avec leur cap (degrés, 0 = nord, sens horaire). */
export function directionArrows(points: RoutePoint[], everyM = 250, max = 8): { lat: number; lng: number; deg: number }[] {
  if (points.length < 2) return []
  const cum = [0]
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1]! + distanceMeters({ lat: points[i - 1]![0], lng: points[i - 1]![1] }, { lat: points[i]![0], lng: points[i]![1] }))
  const total = cum[cum.length - 1]!
  if (total < 100) return []
  const step = Math.max(everyM, total / max)
  const out: { lat: number; lng: number; deg: number }[] = []
  let i = 1
  for (let d = Math.min(step / 2, total / 2); d < total && out.length < max; d += step) {
    while (i < points.length - 1 && cum[i]! < d) i++
    const a = points[i - 1]!
    const b = points[i]!
    const k = (d - cum[i - 1]!) / (cum[i]! - cum[i - 1]! || 1)
    const dx = (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180)
    const dy = b[0] - a[0]
    out.push({ lat: a[0] + k * (b[0] - a[0]), lng: a[1] + k * (b[1] - a[1]), deg: Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360) })
  }
  return out
}

/** Le profil d’altitude : 60 valeurs au plus (moyenne de chaque tranche), avec le plus bas et le plus haut. */
export function altitudeProfile(alt: number[] | undefined, n = 60): { values: number[]; min: number; max: number } | undefined {
  const values = (alt ?? []).filter((a) => Number.isFinite(a))
  if (values.length < 2) return undefined
  const size = Math.max(1, values.length / n)
  const out: number[] = []
  for (let i = 0; i < values.length; i += size) {
    const part = values.slice(Math.floor(i), Math.max(Math.floor(i) + 1, Math.floor(i + size)))
    out.push(Math.round((part.reduce((s, v) => s + v, 0) / part.length) * 10) / 10)
  }
  return { values: out, min: Math.min(...out), max: Math.max(...out) }
}

// ——— Le chien ce jour-là ———

/** « Billy avait 5 mois et 9 jours » (« Votre chien avait… » sans nom) ; rien sans date de naissance ou avant. */
export function dogAgeLine(dog: { name: string; unnamed?: boolean; birthDate?: string }, date: ISODate): string | undefined {
  const birth = dog.birthDate
  if (!birth || !isValidISO(birth) || !isValidISO(date) || date <= birth) return undefined
  const age = ageAt(birth, date)
  if (!age.years && !age.months && !age.days) return undefined
  return `${dogName(dog, 'debut')} avait ${formatAge(birth, date)}`
}

// ——— Ce que montre la fiche ———

/** Le km par km de la fiche : sur le trajet daté (avec le dernier bout), sinon celui gardé. */
export function sheetSplits(route: { track?: Track; trimmed?: { startS: number; endS: number }; kmSplits?: number[] }): Split[] {
  const track = effectiveTrack(route)
  if (track) return kmSplits(track)
  return (route.kmSplits ?? []).map((seconds, i) => ({ km: i + 1, seconds }))
}

/** Vitesse max et cadence : celles gardées, sinon calculées (balade pas encore rattrapée). */
export function sheetFigures(route: FigureInput & { maxSpeed?: number; cadence?: number }): { maxSpeed?: number; cadence?: number } {
  const all = route.maxSpeed !== undefined && (route.cadence !== undefined || !route.steps) ? {} : walkFigures(route)
  const maxSpeed = route.maxSpeed ?? all.maxSpeed
  const cadence = route.cadence ?? all.cadence
  return { ...(maxSpeed ? { maxSpeed } : {}), ...(cadence ? { cadence } : {}) }
}

/** « 0 mm », « 0,4 mm » */
export const rainText = (mm: number) => `${mm.toFixed(mm >= 10 || Number.isInteger(mm) ? 0 : 1).replace('.', ',')} mm`

/** « 3 nouvelles rues », « 12 rues, dont 3 nouvelles », « 1 rue » */
export function streetsSummary(streets: RouteStreet[]): string {
  const fresh = streets.filter((s) => s.new).length
  const all = `${streets.length} rue${streets.length > 1 ? 's' : ''}`
  if (!fresh) return all
  if (fresh === streets.length) return fresh === 1 ? '1 nouvelle rue' : `${fresh} nouvelles rues`
  return `${all}, dont ${fresh} nouvelle${fresh > 1 ? 's' : ''}`
}
