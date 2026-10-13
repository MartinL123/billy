import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/** Dates stockées en ISO `YYYY-MM-DD`, sans heure ni fuseau. */
export type ISODate = string

export interface YMD {
  y: number
  m: number // 1–12
  d: number
}

export function parseISO(iso: ISODate): YMD {
  const [y, m, d] = iso.split('-').map(Number)
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 }
}

export function toISO({ y, m, d }: YMD): ISODate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function isValidISO(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const { y, m, d } = parseISO(iso)
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Numéro de jour (jours depuis 1970), pour les différences sans souci de fuseau. */
export function dayNumber(iso: ISODate): number {
  const { y, m, d } = parseISO(iso)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function diffDays(from: ISODate, to: ISODate): number {
  return dayNumber(to) - dayNumber(from)
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() })
}

/** Ajoute des mois en restant dans le mois visé (31 janv. + 1 mois = 28 ou 29 févr.). */
export function addMonths(iso: ISODate, months: number): ISODate {
  const { y, m, d } = parseISO(iso)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return toISO({ y: ny, m: nm, d: Math.min(d, daysInMonth(ny, nm)) })
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = new Date(dayNumber(iso) * 86_400_000 + days * 86_400_000)
  return toISO({ y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() })
}

function toLocalDate(iso: ISODate): Date {
  const { y, m, d } = parseISO(iso)
  return new Date(y, m - 1, d)
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const dayLabel = (iso: ISODate) => (parseISO(iso).d === 1 ? '1er' : String(parseISO(iso).d))

/** « 13 mai 2026 » */
export function formatLong(iso: ISODate): string {
  return `${dayLabel(iso)} ${format(toLocalDate(iso), 'MMMM yyyy', { locale: fr })}`
}

/** « 13 oct. » (ou « 13 oct. 2027 » si l'année diffère de `refYear`) */
export function formatShort(iso: ISODate, refYear?: number): string {
  const withYear = refYear !== undefined && parseISO(iso).y !== refYear
  return `${dayLabel(iso)} ${format(toLocalDate(iso), withYear ? 'MMM yyyy' : 'MMM', { locale: fr })}`
}

/** « Sam. 17 oct. » */
export function formatWeekdayShort(iso: ISODate, refYear?: number): string {
  return `${capitalize(format(toLocalDate(iso), 'EEE', { locale: fr }))} ${formatShort(iso, refYear)}`
}

/** « SAM. » */
export function weekdayAbbr(iso: ISODate): string {
  return format(toLocalDate(iso), 'EEE', { locale: fr }).toUpperCase()
}

/** « oct. » */
export function monthAbbr(iso: ISODate): string {
  return format(toLocalDate(iso), 'MMM', { locale: fr })
}

/** « Octobre 2026 » */
export function formatMonthYear(iso: ISODate): string {
  return capitalize(format(toLocalDate(iso), 'MMMM yyyy', { locale: fr }))
}

/** « Mardi 13 octobre » */
export function formatDayHeading(iso: ISODate): string {
  return capitalize(`${format(toLocalDate(iso), 'EEEE', { locale: fr })} ${dayLabel(iso)} ${format(toLocalDate(iso), 'MMMM', { locale: fr })}`)
}

/** « aujourd'hui », « demain », « dans 4 jours », « hier », « il y a 3 jours » */
export function formatRelative(iso: ISODate, today: ISODate): string {
  const diff = diffDays(today, iso)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'demain'
  if (diff === -1) return 'hier'
  return diff > 0 ? `dans ${diff} jours` : `il y a ${-diff} jours`
}

/** « 14 h 00 » à partir de « 14:00 » */
export function formatTime(time: string): string {
  const [h, min] = time.split(':')
  return `${Number(h)} h ${min ?? '00'}`
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7)
}
