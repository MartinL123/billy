import { bossById } from '../content/training'
import { isTrainingEntry, notedExercise, notedMinutes } from './billyPage'
import { diffDays, formatDayHeading, formatLong, parseISO, type ISODate } from './dates'
import { feelingLabel } from './moment'
import type { NotedOuting } from './notedOutings'
import { outingAbout, outingName } from './notedOutings'
import { walkInstant, weekStart, type WalkItem } from './walkList'

// R-098 « Le journal de [prénom] » : le panneau de la carte devient le journal du chien, jour par jour : ses balades,
// ses sorties notées sans trajet, ses souvenirs, ses séances, ce qui a été fait pour sa santé (soin donné, pesée).
// Rien de nouveau dans Firestore : tout est lu dans ce qui existe. Fonctions pures, testées.

export type JournalPill = 'tout' | 'balades' | 'souvenirs' | 'seances' | 'sante'

export const JOURNAL_PILLS: { id: JournalPill; label: string }[] = [
  { id: 'tout', label: 'Tout' },
  { id: 'balades', label: 'Balades' },
  { id: 'souvenirs', label: 'Souvenirs' },
  { id: 'seances', label: 'Séances' },
  { id: 'sante', label: 'Santé' },
]

export const isJournalPill = (value: string | null): value is JournalPill => JOURNAL_PILLS.some((p) => p.id === value)

type Line = { title: string; line: string }

export type JournalItem<W> =
  | { kind: 'walk'; id: string; date: ISODate; at: number; walk: W }
  | ({ kind: 'outing'; id: string; date: ISODate; at: number; outing: NotedOuting } & Line)
  | ({ kind: 'memo'; id: string; date: ISODate; at: number; thumb?: string } & Line)
  | ({ kind: 'session'; id: string; date: ISODate; at: number } & Line)
  | ({ kind: 'care'; id: string; date: ISODate; at: number } & Line)
  | ({ kind: 'weight'; id: string; date: ISODate; at: number } & Line)

const PILL_OF: Record<JournalItem<unknown>['kind'], JournalPill> = { walk: 'balades', outing: 'balades', memo: 'souvenirs', session: 'seances', care: 'sante', weight: 'sante' }

export const pillOf = (item: Pick<JournalItem<unknown>, 'kind'>): JournalPill => PILL_OF[item.kind]

interface EntryLike {
  id: string
  date: ISODate
  text: string
  photos: { thumbFileId: string }[]
  route?: { points?: unknown[] }
  skills?: string[]
  feeling?: string
  createdAt?: string
}
interface EventLike {
  id: string
  title: string
  type: string
  date: ISODate | ''
  done: boolean
  doneAt?: ISODate
  nextId?: string
}
interface WeightLike {
  id: string
  date: ISODate
  kg: number
}

/** Les soins qui comptent dans « Santé » : vaccin, vermifuge, antiparasitaire, visite chez le véto. */
const CARE_TYPES = ['vaccin', 'vermifuge', 'antiparasitaire', 'veto']
/** Les moments écrits seuls par l’app (repos, palier, niveau) : pas des souvenirs. */
const AUTO = ['repos-', 'palier-', 'niveau-']

const noon = (date: ISODate) => new Date(`${date}T12:00:00`).getTime()
const instant = (iso: string | undefined, date: ISODate) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? t : noon(date)
}
const kgText = (kg: number) => `${(Math.round(kg * 10) / 10).toFixed(1).replace('.', ',')} kg`
const quote = (text: string) => `« ${text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text} »`

/** « Vermifuge donné », « Vaccin fait », « RDV vétérinaire ». */
function careTitle(e: Pick<EventLike, 'title' | 'type'>): string {
  const title = e.title.trim() || 'Soin'
  if (e.type === 'vermifuge' || e.type === 'antiparasitaire') return `${title} donné`
  if (e.type === 'vaccin') return `${title} fait`
  return title
}

/** Tout ce que le journal peut montrer, du plus récent au plus ancien. */
export function journalItems<W extends Pick<WalkItem, 'id' | 'date' | 'route'>>({ walks, outings, entries, events, weights }: { walks: W[]; outings: NotedOuting[]; entries: EntryLike[]; events: EventLike[]; weights: WeightLike[] }): JournalItem<W>[] {
  const items: JournalItem<W>[] = []
  for (const walk of walks) items.push({ kind: 'walk', id: walk.id, date: walk.date, at: walkInstant(walk), walk })
  for (const o of outings) items.push({ kind: 'outing', id: o.id, date: o.date, at: o.time ? new Date(`${o.date}T${o.time}:00`).getTime() : noon(o.date), outing: o, title: `${outingName(o.slot)} · ${o.minutes} min`, line: ['Notée sans trajet', outingAbout(o)].filter(Boolean).join(', ') })
  for (const e of entries) {
    if (e.route?.points?.length || AUTO.some((p) => e.id.startsWith(p))) continue
    const at = instant(e.createdAt, e.date)
    const feeling = feelingLabel(e.feeling)
    if (isTrainingEntry(e)) {
      const skill = bossById(e.skills![0]!)?.name
      const exercise = notedExercise(e.text)
      const minutes = notedMinutes(e.text)
      items.push({ kind: 'session', id: e.id, date: e.date, at, title: skill ? `Séance · ${skill}` : 'Séance', line: [exercise ? quote(exercise) : '', minutes ? `${minutes} min` : '', feeling ?? ''].filter(Boolean).join(' · ') || 'Séance notée' })
      continue
    }
    if (!e.text.trim() && !e.photos.length) continue
    const [first = '', ...rest] = e.text.split('\n')
    const more = rest.join(' ').trim()
    items.push({ kind: 'memo', id: e.id, date: e.date, at, title: first.trim() || 'Un souvenir', line: [more ? quote(more) : '', feeling ?? ''].filter(Boolean).join(' · ') || 'Souvenir', ...(e.photos[0] ? { thumb: e.photos[0].thumbFileId } : {}) })
  }
  for (const e of events) {
    const date = e.doneAt || e.date
    if (!e.done || !date || !CARE_TYPES.includes(e.type)) continue
    // Le prochain : l’occurrence suivante créée en cochant, sinon le même soin à venir le plus proche.
    const next = (e.nextId ? events.find((n) => n.id === e.nextId && !n.done && n.date) : undefined) ?? events.filter((n) => !n.done && n.date && n.type === e.type && n.title === e.title && n.date > date).sort((a, b) => a.date.localeCompare(b.date))[0]
    items.push({ kind: 'care', id: e.id, date, at: noon(date), title: careTitle(e), line: next ? `Prochain : ${formatLong(next.date)}` : 'Fait' })
  }
  const byDate = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  byDate.forEach((w, i) => {
    const before = byDate[i - 1]
    let line = 'Première pesée'
    if (before) {
      const days = diffDays(before.date, w.date)
      const delta = Math.round((w.kg - before.kg) * 10) / 10
      const span = days === 1 ? 'en 1 jour' : `en ${days} jours`
      line = delta ? `${delta > 0 ? '+' : '−'}${kgText(Math.abs(delta))} ${span}` : `Même poids ${days === 1 ? 'que la veille' : `qu’il y a ${days} jours`}`
    }
    items.push({ kind: 'weight', id: w.id, date: w.date, at: noon(w.date) - 1, title: `Pesée · ${kgText(w.kg)}`, line })
  })
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at)
}

/** « Aujourd’hui, vendredi 23 octobre », « Hier, jeudi 22 octobre », « Mercredi 21 octobre » (l’année si elle diffère). */
export function journalDayLabel(date: ISODate, today: ISODate): string {
  const heading = formatDayHeading(date)
  const diff = diffDays(date, today)
  if (diff === 0) return `Aujourd’hui, ${heading.toLocaleLowerCase('fr')}`
  if (diff === 1) return `Hier, ${heading.toLocaleLowerCase('fr')}`
  return parseISO(date).y === parseISO(today).y ? heading : `${heading} ${parseISO(date).y}`
}

export interface JournalGroup<W> {
  date: ISODate
  label: string
  items: JournalItem<W>[]
}

/** Les éléments d’une pastille, groupés par jour (déjà triés du plus récent au plus ancien). */
export function journalGroups<W>(items: JournalItem<W>[], pill: JournalPill, today: ISODate): JournalGroup<W>[] {
  const groups: JournalGroup<W>[] = []
  for (const item of items) {
    if (pill !== 'tout' && pillOf(item) !== pill) continue
    const last = groups[groups.length - 1]
    if (last?.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, label: journalDayLabel(item.date, today), items: [item] })
  }
  return groups
}

/** « 3 balades · 7,1 km · 1 souvenir · 1 séance cette semaine » (depuis lundi) : les nombres à part, pour le gras. */
export function weekSummary(items: JournalItem<Pick<WalkItem, 'route'>>[], today: ISODate): { n: string; label: string }[] {
  const week = items.filter((i) => i.date >= weekStart(today) && i.date <= today)
  const walks = week.filter((i) => i.kind === 'walk' || i.kind === 'outing').length
  const km = week.reduce((sum, i) => sum + (i.kind === 'walk' ? i.walk.route.distanceM : 0), 0) / 1000
  const memos = week.filter((i) => i.kind === 'memo').length
  const sessions = week.filter((i) => i.kind === 'session').length
  const out: { n: string; label: string }[] = []
  if (walks) out.push({ n: String(walks), label: walks > 1 ? 'balades' : 'balade' })
  if (km >= 0.05) out.push({ n: km.toFixed(1).replace('.', ','), label: 'km' })
  if (memos) out.push({ n: String(memos), label: memos > 1 ? 'souvenirs' : 'souvenir' })
  if (sessions) out.push({ n: String(sessions), label: sessions > 1 ? 'séances' : 'séance' })
  return out
}

/** L’état vide d’une pastille. */
export function emptyPillText(pill: JournalPill): string {
  if (pill === 'balades') return 'Pas encore de balade.'
  if (pill === 'souvenirs') return 'Pas encore de souvenir.'
  if (pill === 'seances') return 'Pas encore de séance notée.'
  if (pill === 'sante') return 'Rien de fait pour sa santé pour l’instant.'
  return 'Son journal est encore vide.'
}
