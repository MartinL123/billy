import { bossById, MAX_LEVEL } from '../content/training'
import { stepShort } from '../content/phrases'
import type { BossProgress } from './bossProgress'
import { diffDays, formatShort, parseISO, type ISODate } from './dates'
import { programWeek, weekOf, type ProgramDay } from './rhythm'

// La page Billy (spec V6.1 § 10, T-104) : sa semaine, ses badges et ses progrès, calculés ici, sans Firestore.

interface EntryLike {
  id: string
  date: ISODate
  text: string
  skills?: string[]
  feeling?: string
  createdAt?: string
  route?: { points?: unknown[]; moments?: { type: string; street?: string }[] }
}

/** Les cartes écrites par l’app (repos, étape acquise, niveau) ne sont pas des séances. */
const AUTO_PREFIXES = ['repos-', 'palier-', 'niveau-']

/** Une séance d’entraînement : un moment noté sur au moins une compétence, qui n’est pas une balade. */
export const isTrainingEntry = (e: EntryLike): boolean =>
  Boolean(e.skills?.length) && !e.route?.points?.length && !AUTO_PREFIXES.some((p) => e.id.startsWith(p))

/** « Le jeu du prénom, 3 minutes. » (texte pré-rempli par la mission) : la durée notée, sinon `undefined`. */
export function notedMinutes(text: string): number | undefined {
  const match = /(\d{1,2})\s*min(?:ute)?s?\b/i.exec(text)
  const n = match ? Number(match[1]) : NaN
  return n > 0 && n <= 60 ? n : undefined
}

/** Le nom de l’exercice au début du texte pré-rempli (« Jeu du prénom, 3 minutes. »), s’il y est. */
export function notedExercise(text: string): string | undefined {
  return /^([^,.\n]{2,40}), \d{1,2} minutes?\b/.exec(text)?.[1]?.trim()
}

/** Ce qu’on a travaillé pendant une séance : l’exercice noté, sinon les compétences (« Le Rappel, Le Lien »). */
export const sessionTitle = (e: Pick<EntryLike, 'text' | 'skills'>): string =>
  notedExercise(e.text) ?? ((e.skills ?? []).map((id) => bossById(id)?.name).filter(Boolean).join(', ') || 'Une séance')

export interface WeekDay extends ProgramDay {
  /** Jour après aujourd’hui : pointillés. */
  upcoming: boolean
  /** Les séances du jour, de la plus ancienne à la plus récente. */
  sessionIds: string[]
}

export interface TrainingWeek {
  days: WeekDay[]
  sessions: number
  minutes: number
}

/**
 * « Sa semaine » : coche = jour d’entraînement, lune = repos, aujourd’hui entouré, pointillés sinon. Jamais « raté ».
 * Les minutes : celles notées dans le texte de la séance, sinon la durée d’une séance à son âge ce jour-là.
 */
export function trainingWeek(today: ISODate, entries: EntryLike[], rests: ISODate[], minutesAt: (date: ISODate) => number): TrainingWeek {
  const week = new Set(weekOf(today))
  const sessions = entries
    .filter((e) => week.has(e.date) && isTrainingEntry(e))
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  const days = programWeek(
    today,
    sessions.map((s) => s.date),
    rests,
  ).map((day) => ({ ...day, upcoming: day.date > today, sessionIds: sessions.filter((s) => s.date === day.date).map((s) => s.id) }))
  const minutes = sessions.reduce((sum, s) => sum + (notedMinutes(s.text) ?? minutesAt(s.date)), 0)
  return { days, sessions: sessions.length, minutes }
}

/** « 4 séances · 14 min », « 1 séance · 3 min », « Aucune séance » (espaces insécables dans « 14 min »). */
export function weekSummary(week: Pick<TrainingWeek, 'sessions' | 'minutes'>): string {
  if (week.sessions === 0) return 'Aucune séance'
  return `${week.sessions} séance${week.sessions > 1 ? 's' : ''} · ${week.minutes} min`
}

// ——— Ses progrès ———

export type ProgressKind = 'etape' | 'seance' | 'rappel'

export interface ProgressItem {
  id: string
  date: ISODate
  kind: ProgressKind
  title: string
  detail: string
  /** Où mène un toucher. */
  to: string
  /** Pour départager deux moments du même jour. */
  createdAt?: string
}

interface XpLike {
  id: string
  date: ISODate
  kind: string
  bossId?: string
  key?: string
  createdAt?: string
}

/**
 * Le fil de ses progrès, du plus récent au plus ancien : les étapes acquises dans l’app (pas celles déclarées
 * « avant l’app », ni une étape décochée depuis), les séances « Super » et les « Super rappel » posés en balade.
 */
export function progressFeed(entries: EntryLike[], xpLog: XpLike[], progress: Record<string, Pick<BossProgress, 'level'> | undefined>): ProgressItem[] {
  const items: ProgressItem[] = []
  for (const xp of xpLog) {
    if (xp.kind !== 'palier' || xp.key === 'avant' || !xp.bossId) continue
    const step = Number(/^palier-.+-(\d)$/.exec(xp.id)?.[1])
    const boss = bossById(xp.bossId)
    if (!boss || !(step >= 1 && step <= MAX_LEVEL) || step > (progress[xp.bossId]?.level ?? 0)) continue
    items.push({ id: xp.id, date: xp.date, kind: 'etape', title: stepShort(xp.bossId, step), detail: `Étape acquise · ${boss.name}`, to: `/competence/${xp.bossId}`, createdAt: xp.createdAt })
  }
  for (const entry of entries) {
    if (isTrainingEntry(entry) && entry.feeling === 'super') {
      const minutes = notedMinutes(entry.text)
      items.push({ id: entry.id, date: entry.date, kind: 'seance', title: 'Séance « Super »', detail: [sessionTitle(entry), minutes ? `${minutes} min` : ''].filter(Boolean).join(' · '), to: `/souvenir/${entry.id}`, createdAt: entry.createdAt })
    }
    const rappel = entry.route?.moments?.find((m) => m.type === 'rappel')
    if (entry.route?.points?.length && rappel) {
      const walk = entry.text.split('\n')[0]?.trim() || 'Une balade'
      items.push({ id: `${entry.id}-rappel`, date: entry.date, kind: 'rappel', title: 'Super rappel en balade', detail: rappel.street || walk, to: `/souvenir/${entry.id}`, createdAt: entry.createdAt })
    }
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

/** « Aujourd’hui », « Hier », « 20 oct. » (avec l’année si elle diffère). */
export function progressDate(date: ISODate, today: ISODate): string {
  const diff = diffDays(date, today)
  if (diff === 0) return 'Aujourd’hui'
  if (diff === 1) return 'Hier'
  return formatShort(date, parseISO(today).y)
}

// ——— Ses badges ———

export const RING_SEGMENTS = MAX_LEVEL
export const RING_GOLD = '#E8B33A'
export const RING_PALE = '#E6EAE7'

export interface BadgeRing {
  /** Couleur de chaque segment, dans le sens des aiguilles d’une montre depuis le haut. */
  segments: string[]
  mastered: boolean
  /** « En cours » (compétence travaillée), « Maîtrisé », ou rien. */
  status?: 'En cours' | 'Maîtrisé'
}

/** Un anneau de 5 segments : la couleur du territoire par étape acquise, tout doré une fois maîtrisée, pâle sinon. Jamais de cadenas. */
export function badgeRing(level: number, color: string, active: boolean): BadgeRing {
  const done = Math.max(0, Math.min(RING_SEGMENTS, Math.floor(level)))
  const mastered = done >= RING_SEGMENTS
  return {
    segments: Array.from({ length: RING_SEGMENTS }, (_, i) => (mastered ? RING_GOLD : i < done ? color : RING_PALE)),
    mastered,
    status: mastered ? 'Maîtrisé' : active ? 'En cours' : undefined,
  }
}

/** Le nom sous un badge : sans l’article quand il est long (« Bonnes manières »), pour tenir sur deux lignes au plus. */
export function badgeName(name: string): string {
  if (name.length <= 15) return name
  const bare = name.replace(/^(Les|Le|La|L’)\s*/, '')
  return bare.charAt(0).toLocaleUpperCase('fr') + bare.slice(1)
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Les arcs SVG des segments (cercle de rayon `r` centré en `c`), séparés par `gapDeg` degrés, le premier en haut. */
export function ringArcs(c: number, r: number, gapDeg = 8, count = RING_SEGMENTS): string[] {
  const span = 360 / count
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return `${round1(c + r * Math.cos(rad))} ${round1(c + r * Math.sin(rad))}`
  }
  return Array.from({ length: count }, (_, i) => {
    const from = i * span + gapDeg / 2
    const to = (i + 1) * span - gapDeg / 2
    return `M${point(from)} A${r} ${r} 0 0 1 ${point(to)}`
  })
}

/** La part du trait vert entre le premier et le dernier point du chemin : jusqu’à l’étape en cours. */
export const pathProgress = (level: number): number => Math.max(0, Math.min(1, Math.floor(level) / (RING_SEGMENTS - 1)))
