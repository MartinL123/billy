import { addDays, diffDays, todayISO, type ISODate } from './dates'
import { formatHour, slotForStart, walkName, type WalkSlot, type WalkTimes } from './walks'

// T-085 (spec V6 § 5) : sans Watch, l'iPhone sait quand on a marché (Mouvements et forme, `CMMotionActivityManager`),
// jamais où. L'app iOS renvoie les périodes « à pied » brutes des 7 derniers jours ; ce fichier choisit celle à proposer
// sur l'accueil : « Vous avez marché 35 min vers 8 h. C'était une sortie avec Billy ? ».

/** Une période « à pied » vue par l'iPhone (heures ISO). */
export interface MotionPeriod {
  start: string
  end: string
}

/** Une marche de 10 min ou plus. */
export const MIN_WALK_MIN = 10
/** Deux périodes séparées de moins de 2 min (un feu rouge, une porte) n'en font qu'une. */
export const MERGE_GAP_MS = 2 * 60_000
/** Une marche finie il y a moins de 5 min est peut-être encore en cours : on attend. */
export const SETTLE_MS = 5 * 60_000
/** On regarde les 7 derniers jours. */
export const LOOKBACK_DAYS = 7
/** Une balade qui commence ou finit à 5 min près recouvre la marche. */
const COVER_MARGIN_MS = 5 * 60_000

export interface MotionSuggestion {
  /** Identifiant stable de la période (début à la minute, heure de l'iPhone) : « Non » la retire pour toujours. */
  id: string
  start: string
  end: string
  minutes: number
  date: ISODate
  slot: WalkSlot
  /** « HH:MM » : l'heure de départ, gardée comme heure de la sortie notée. */
  time: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Recolle les périodes proches (moins de 2 min d'écart), dans l'ordre. Les périodes illisibles sont écartées. */
export function mergePeriods(periods: MotionPeriod[]): { start: number; end: number }[] {
  const spans = periods
    .map((p) => ({ start: Date.parse(p.start), end: Date.parse(p.end) }))
    .filter((p) => Number.isFinite(p.start) && Number.isFinite(p.end) && p.end > p.start)
    .sort((a, b) => a.start - b.start)
  const out: { start: number; end: number }[] = []
  for (const span of spans) {
    const last = out[out.length - 1]
    if (last && span.start - last.end < MERGE_GAP_MS) last.end = Math.max(last.end, span.end)
    else out.push({ ...span })
  }
  return out
}

export const motionPeriodId = (start: number) => {
  const d = new Date(start)
  return `${todayISO(d)}T${localTime(d)}`
}

interface EntryLike {
  route?: { startTime?: string; endTime?: string; durationMin?: number }
}

/** Une balade enregistrée (GPS, Watch, Strava) recouvre-t-elle la marche ? */
function coveredByEntry(span: { start: number; end: number }, entries: EntryLike[]): boolean {
  return entries.some((e) => {
    const start = e.route?.startTime ? Date.parse(e.route.startTime) : NaN
    if (Number.isNaN(start)) return false
    const endParsed = e.route?.endTime ? Date.parse(e.route.endTime) : NaN
    const end = Number.isNaN(endParsed) ? start + (e.route?.durationMin ?? 0) * 60_000 : endParsed
    return start - COVER_MARGIN_MS < span.end && end + COVER_MARGIN_MS > span.start
  })
}

/**
 * La marche à proposer : la plus récente de 10 min ou plus, des 7 derniers jours, finie depuis 5 min au moins, avec une
 * sortie à son heure (à 3 h près), pas déjà couverte par une balade ou une sortie notée ce jour-là, ni écartée (« Non »).
 */
export function motionSuggestion({ periods, now, entries, walks, times, dismissed }: { periods: MotionPeriod[]; now: Date; entries: EntryLike[]; walks: { date: string; done?: Partial<Record<WalkSlot, string>> }[]; times: WalkTimes; dismissed: string[] }): MotionSuggestion | undefined {
  const today = todayISO(now)
  const first = addDays(today, -(LOOKBACK_DAYS - 1))
  const spans = mergePeriods(periods).reverse()
  for (const span of spans) {
    const minutes = Math.round((span.end - span.start) / 60_000)
    if (minutes < MIN_WALK_MIN || now.getTime() - span.end < SETTLE_MS) continue
    const start = new Date(span.start)
    const date = todayISO(start)
    if (date < first || date > today) continue
    const id = motionPeriodId(span.start)
    if (dismissed.includes(id)) continue
    const slot = slotForStart(times, start.getHours() * 60 + start.getMinutes())
    if (!slot) continue
    if (walks.find((w) => w.date === date)?.done?.[slot]) continue
    if (coveredByEntry(span, entries)) continue
    return { id, start: start.toISOString(), end: new Date(span.end).toISOString(), minutes, date, slot, time: localTime(start) }
  }
  return undefined
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** « vers 8 h », « vers 8 h 45 » : le départ arrondi au quart d'heure. */
export function aroundHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.round(((h ?? 0) * 60 + (m ?? 0)) / 15) * 15
  return `vers ${formatHour(`${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`)}`
}

/** « Vous avez marché 35 min vers 8 h. » (« hier vers 8 h », « mardi vers 8 h ») */
export function motionSentence(s: Pick<MotionSuggestion, 'minutes' | 'date' | 'time'>, today: ISODate): string {
  const ago = diffDays(s.date, today)
  const day = ago === 0 ? '' : ago === 1 ? 'hier ' : `${WEEKDAYS[new Date(`${s.date}T12:00:00`).getDay()]} `
  const length = s.minutes >= 60 ? `${Math.floor(s.minutes / 60)} h${s.minutes % 60 ? ` ${pad(s.minutes % 60)}` : ''}` : `${s.minutes} min`
  return `Vous avez marché ${length} ${day}${aroundHour(s.time)}.`
}

/** Le nom de la sortie notée : « Sortie du matin ». */
export const motionWalkName = (time: string) => walkName(time).replace(/^la s/, 'S')

/** Les « Non » gardés : seulement ceux des 14 derniers jours (au-delà, la période n'est plus proposée de toute façon). */
export function keptDismissed(dismissed: string[], now: Date): string[] {
  const limit = addDays(todayISO(now), -14)
  return dismissed.filter((id) => id.slice(0, 10) >= limit)
}
