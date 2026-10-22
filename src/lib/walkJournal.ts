import { diffDays, formatDayHeading, formatTime, parseISO, type ISODate } from './dates'
import { isHardMoment, routeMomentInfo, type Route } from './route'
import { walkInstant, type WalkItem } from './walkList'

// T-097 (V6.1 § 4) : le panneau de la carte devient le journal des balades, groupé par jour (« Aujourd’hui »,
// « Hier », « Mardi 20 octobre »). Fonctions pures, testées.

/** Un souvenir sans trajet (une photo, une note), montré en petite ligne le jour d’une balade. */
export interface JournalMemo {
  id: string
  date: ISODate
  text: string
  createdAt?: string
  thumb?: string
}

export type JournalRow<W> = { kind: 'balade'; walk: W } | { kind: 'souvenir'; memo: JournalMemo }

export interface JournalDay<W> {
  date: ISODate
  label: string
  rows: JournalRow<W>[]
}

/** « Aujourd’hui », « Hier », « Mardi 20 octobre » (l’année en plus si ce n’est pas celle d’aujourd’hui). */
export function dayLabel(date: ISODate, today: ISODate): string {
  const diff = diffDays(date, today)
  if (diff === 0) return 'Aujourd’hui'
  if (diff === 1) return 'Hier'
  const heading = formatDayHeading(date)
  return parseISO(date).y === parseISO(today).y ? heading : `${heading} ${parseISO(date).y}`
}

const memoInstant = (m: JournalMemo) => {
  const t = Date.parse(m.createdAt ?? '')
  return Number.isFinite(t) ? t : new Date(`${m.date}T12:00:00`).getTime()
}

/**
 * Les jours du journal, du plus récent au plus ancien : les balades (déjà filtrées) et, les jours où il y en a, les
 * souvenirs sans trajet de ce jour-là. Dans un jour, du plus récent au plus ancien.
 */
export function journalDays<W extends Pick<WalkItem, 'date' | 'route'>>(walks: W[], memos: JournalMemo[], today: ISODate): JournalDay<W>[] {
  const days = new Map<ISODate, { row: JournalRow<W>; at: number }[]>()
  for (const walk of walks) {
    const list = days.get(walk.date) ?? []
    list.push({ row: { kind: 'balade', walk }, at: walkInstant(walk) })
    days.set(walk.date, list)
  }
  for (const memo of memos) days.get(memo.date)?.push({ row: { kind: 'souvenir', memo }, at: memoInstant(memo) })
  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({ date, label: dayLabel(date, today), rows: list.sort((a, b) => b.at - a.at).map((x) => x.row) }))
}

/** « Souvenir · 14 h » (l’heure où il a été noté, si on la connaît). */
export function memoLine(memo: Pick<JournalMemo, 'createdAt'>): string {
  const t = memo.createdAt ? new Date(memo.createdAt) : undefined
  if (!t || !Number.isFinite(t.getTime())) return 'Souvenir'
  return `Souvenir · ${formatTime(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`)}`
}

/** Les pastilles d’une balade : ses repères (une fois chacun, « À raconter » à part), « Pipi · rue X » si on la sait. */
export function walkPills(route: Pick<Route, 'moments'>): { label: string; hard: boolean }[] {
  const seen = new Set<string>()
  const out: { label: string; hard: boolean }[] = []
  for (const m of route.moments) {
    if (m.type === 'araconter') continue
    const label = m.street ? `${routeMomentInfo(m.type).label} · ${m.street}` : routeMomentInfo(m.type).label
    if (seen.has(label)) continue
    seen.add(label)
    out.push({ label, hard: isHardMoment(m) })
  }
  return out
}
