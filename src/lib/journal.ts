import { addDays, type ISODate } from './dates'

// T-066 : le journal d'événements privé (docs/profondeur/05-mesure.md). Un document par jour sous le compte, jamais
// envoyé ailleurs. Ce fichier calcule les 3 indicateurs ; src/firebase/journal.ts écrit les événements.

export type JournalEvent =
  | { type: 'walk_start'; at: string }
  | { type: 'walk_saved'; at: string; source: 'gps' | 'watch' | 'gpx' | 'sortie'; min?: number; m?: number }
  | { type: 'walk_recovered'; at: string }
  | { type: 'walk_error'; at: string; step: string }
  | { type: 'walk_discarded'; at: string; min?: number }
  | { type: 'care_done'; at: string; lateDays: number }
  | { type: 'session_start'; at: string; skill?: string }
  | { type: 'session_done'; at: string; skill?: string; sec?: number }
  | { type: 'app_open'; at: string; native: boolean }
  | { type: 'crash_reload'; at: string; reason: string }

export interface JournalDay {
  date: ISODate
  events: JournalEvent[]
}

/** Un soin est « fait à temps » au plus 3 jours après sa date. */
export const ON_TIME_DAYS = 3

const median = (values: number[]) => {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

/** Les 3 indicateurs sur les `days` derniers jours (aujourd'hui compris). */
export function indicators(journal: JournalDay[], today: ISODate, days: number) {
  const from = addDays(today, -(days - 1))
  const events = journal.filter((d) => d.date >= from && d.date <= today).flatMap((d) => d.events)
  const count = (type: JournalEvent['type']) => events.filter((e) => e.type === type).length

  const saved = events.filter((e): e is Extract<JournalEvent, { type: 'walk_saved' }> => e.type === 'walk_saved')
  const gpsSaved = saved.filter((e) => e.source === 'gps').length
  const started = count('walk_start')
  const discarded = count('walk_discarded')
  const bySource = { gps: gpsSaved, watch: 0, gpx: 0, sortie: 0 }
  for (const e of saved) if (e.source !== 'gps') bySource[e.source] += 1

  const cares = events.filter((e): e is Extract<JournalEvent, { type: 'care_done' }> => e.type === 'care_done')
  const onTime = cares.filter((e) => e.lateDays <= ON_TIME_DAYS).length

  const sessions = events.filter((e): e is Extract<JournalEvent, { type: 'session_done' }> => e.type === 'session_done')
  const trainedDays = new Set(journal.filter((d) => d.date >= from && d.date <= today && d.events.some((e) => e.type === 'session_done')).map((d) => d.date)).size

  return {
    days,
    walks: {
      started,
      saved: saved.length,
      bySource,
      discarded,
      recovered: count('walk_recovered'),
      errors: count('walk_error'),
      // Démarrée sur l'iPhone, ni gardée ni volontairement effacée : perdue (ou encore en cours).
      lost: Math.max(0, started - gpsSaved - discarded),
    },
    care: { done: cares.length, onTime, rate: cares.length ? onTime / cares.length : undefined },
    training: { days: trainedDays, rate: trainedDays / days, medianSec: median(sessions.flatMap((e) => (e.sec ? [e.sec] : []))) },
    crashes: count('crash_reload'),
  }
}
