import { distanceMeters } from './community'
import { simplifyWalk, type TimedPoint } from './balade'
import type { ISODate } from './dates'
import type { RoutePoint } from './route'

// Import des balades Strava (docs/specs/carte-a-decouvrir.md § 6) : fichiers GPX de l’archive ou d’une seule balade.
// Billy ne garde que le trajet allégé, la distance, la durée, la date et le nom. Jamais le rythme cardiaque,
// l’altitude point par point ni l’heure de chaque point.

export interface Activity {
  name?: string
  /** `<type>` du GPX Strava : walking, hiking, cycling, running… */
  type?: string
  points: TimedPoint[]
}

const attr = (attrs: string, name: string) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`).exec(attrs)
  return m ? Number(m[1]) : NaN
}
const tag = (xml: string, name: string) => new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`).exec(xml)?.[1]
const decode = (text: string) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .trim()

/**
 * Lit un GPX (texte) : le nom et le type de l’activité, et les points du parcours avec leur heure.
 * Le rythme cardiaque (gpxtpx:hr) et l’altitude (ele) sont ignorés dès la lecture.
 */
export function parseActivity(xml: string): Activity {
  const track = /<trk\b[\s\S]*?<\/trk>/.exec(xml)?.[0] ?? ''
  // Le nom et le type de la trace, avant ses segments (pas ceux d’un point ou d’un waypoint).
  const head = track.split(/<trkseg\b/)[0] ?? ''
  const name = tag(head, 'name')
  const type = tag(head, 'type')
  const points: TimedPoint[] = []
  for (const m of xml.matchAll(/<(trkpt|rtept)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g)) {
    const lat = attr(m[2]!, 'lat')
    const lng = attr(m[2]!, 'lon')
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) continue
    const time = m[4] ? tag(m[4], 'time') : undefined
    points.push({ lat, lng, ...(time ? { time } : {}) })
  }
  return { ...(name ? { name: decode(name) } : {}), ...(type ? { type: decode(type).toLowerCase() } : {}), points }
}

/** Les marches et randonnées sont gardées ; un fichier sans type aussi (un GPX exporté d’une seule balade). */
export const isWalk = (type: string | undefined) => !type || /^(walk|walking|hike|hiking|marche|randonn[ée]e)$/i.test(type)

/** « 3 sorties à vélo ignorées » : le mot à afficher pour un type écarté. */
export function ignoredLabel(type: string | undefined): string {
  const t = (type ?? '').toLowerCase()
  if (/cycl|ride|bike|vélo|velo/.test(t)) return 'à vélo'
  if (/run|course/.test(t)) return 'en course à pied'
  if (/swim|nage/.test(t)) return 'à la nage'
  return 'd’un autre sport'
}

// Noms donnés automatiquement par Strava (spec § 6) ; un nom choisi par Martin est gardé tel quel.
const MOMENTS: Record<string, string> = { morning: 'du matin', lunch: 'de midi', afternoon: 'de l’après-midi', evening: 'du soir', night: 'de nuit' }

export function frenchName(name: string | undefined, type?: string): string {
  const m = /^(morning|lunch|afternoon|evening|night)\s+(walk|hike)$/i.exec((name ?? '').trim())
  if (m) return `${m[2]!.toLowerCase() === 'hike' ? 'Randonnée' : 'Balade'} ${MOMENTS[m[1]!.toLowerCase()]}`
  if (name?.trim()) return name.trim()
  return /hik/i.test(type ?? '') ? 'Randonnée' : 'Balade'
}

/** Clé de doublon : l’heure de départ + le premier point arrondi à 4 décimales. Réimporter ne crée jamais de doublon. */
export function importKey(points: TimedPoint[]): string {
  const first = points[0]
  if (!first) return ''
  return `${first.time ?? 'sans-heure'}_${first.lat.toFixed(4)}_${first.lng.toFixed(4)}`
}

/** Les clés des balades déjà dans Billy, y compris celles importées avant la clé de doublon (départ + 1er point). */
export function knownImportKeys(entries: { importKey?: string; route?: { startTime?: string; points?: { lat: number; lng: number }[] } }[]): Set<string> {
  const keys = new Set<string>()
  for (const e of entries) {
    if (e.importKey) keys.add(e.importKey)
    const first = e.route?.points?.[0]
    if (e.route?.startTime && first) keys.add(importKey([{ ...first, time: e.route.startTime }]))
  }
  return keys
}

/** Distance en mètres : on ne compte un point que s’il est à 8 m ou plus du précédent (les sauts du GPS à l’arrêt). */
export function walkDistance(points: { lat: number; lng: number }[], minStep = 8): number {
  let total = 0
  let last = points[0]
  for (const p of points.slice(1)) {
    const d = distanceMeters(last!, p)
    if (d >= minStep) {
      total += d
      last = p
    }
  }
  return total
}

/** Le jour d’une heure ISO, à Paris (fuseau de Martin), quel que soit le fuseau du téléphone. */
export function parisDay(time: string): ISODate {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time))
  return parts as ISODate
}

/** L’heure de départ à Paris, en minutes depuis minuit (pour rattacher la balade à un créneau de sortie). */
export function parisMinutes(time: string): number {
  const [h, m] = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(time)).split(':')
  return Number(h) * 60 + Number(m)
}

/** Une balade prête à devenir un moment du Carnet. */
export interface ImportedActivity {
  key: string
  name: string
  date?: ISODate
  startTime?: string
  durationMin?: number
  distanceM: number
  /** Trajet allégé (200 points au plus) : c’est tout ce qui est enregistré du parcours. */
  points: RoutePoint[]
  /** Points complets, avec l’heure : seulement en mémoire, pour le brouillard et les photos. Jamais enregistrés. */
  full: TimedPoint[]
}

export const MAX_STORED_POINTS = 200
/** Un fichier de balade : quelques centaines de Ko ; au-delà de 5 Mo, ce n’est pas une balade. */
export const MAX_GPX_BYTES = 5 * 1024 * 1024

export function toImported(activity: Activity): ImportedActivity | undefined {
  const { points } = activity
  if (points.length < 2) return undefined
  const times = points.map((p) => p.time).filter((t): t is string => Boolean(t) && !Number.isNaN(Date.parse(t!)))
  const startTime = times[0]
  const endTime = times[times.length - 1]
  const durationMin = startTime && endTime ? Math.round((Date.parse(endTime) - Date.parse(startTime)) / 60000) : undefined
  return {
    key: importKey(points),
    name: frenchName(activity.name, activity.type),
    ...(startTime ? { date: parisDay(startTime), startTime } : {}),
    ...(durationMin ? { durationMin } : {}),
    distanceM: Math.round(walkDistance(points)),
    points: simplifyWalk(
      points.map((p): RoutePoint => [p.lat, p.lng]),
      MAX_STORED_POINTS,
    ),
    full: points,
  }
}

/** Un fichier `.gz` de l’archive Strava : décompressé par le navigateur, sans bibliothèque. */
export async function readActivityFile(file: Blob & { name?: string }): Promise<string> {
  if (/\.gz$/i.test(file.name ?? '')) {
    const stream = file.stream().pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).text()
  }
  return file.text()
}

/** Extension acceptée : GPX (et sa version .gz). TCX et FIT : pas encore (à voir sur la vraie archive). */
export const isGpxFile = (name: string) => /\.gpx(\.gz)?$/i.test(name)
