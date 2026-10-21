import { describe, expect, it } from 'vitest'
import { indicators, type JournalDay } from './journal'

const at = (d: string) => `${d}T10:00:00.000Z`

describe('journal privé : les 3 indicateurs (T-066)', () => {
  const journal: JournalDay[] = [
    { date: '2026-10-15', events: [{ type: 'walk_start', at: at('2026-10-15') }] },
    {
      date: '2026-10-20',
      events: [
        { type: 'walk_start', at: at('2026-10-20') },
        { type: 'walk_saved', at: at('2026-10-20'), source: 'gps', min: 40, m: 2500 },
        { type: 'walk_saved', at: at('2026-10-20'), source: 'watch', min: 44 },
        { type: 'walk_start', at: at('2026-10-20') },
        { type: 'walk_discarded', at: at('2026-10-20'), min: 1 },
        { type: 'care_done', at: at('2026-10-20'), lateDays: 0 },
        { type: 'session_done', at: at('2026-10-20'), sec: 200 },
        { type: 'session_done', at: at('2026-10-20'), sec: 160 },
      ],
    },
    { date: '2026-10-21', events: [{ type: 'care_done', at: at('2026-10-21'), lateDays: 9 }, { type: 'session_done', at: at('2026-10-21'), sec: 180 }, { type: 'crash_reload', at: at('2026-10-21'), reason: 'firestoreCrash' }] },
  ]

  it('sur 7 jours : balades, soins à temps, jours entraînés, médiane d’une séance', () => {
    const r = indicators(journal, '2026-10-21', 7)
    expect(r.walks).toEqual({ started: 3, saved: 2, bySource: { gps: 1, watch: 1, gpx: 0, sortie: 0 }, discarded: 1, recovered: 0, errors: 0, lost: 1 })
    expect(r.care).toEqual({ done: 2, onTime: 1, rate: 0.5 })
    expect(r.training).toEqual({ days: 2, rate: 2 / 7, medianSec: 180 })
    expect(r.crashes).toBe(1)
  })

  it('la fenêtre compte : sur 2 jours, la balade démarrée le 15 n’entre pas', () => {
    expect(indicators(journal, '2026-10-21', 2).walks.lost).toBe(0)
  })

  it('sans événement : rien n’est inventé', () => {
    const r = indicators([], '2026-10-21', 30)
    expect(r.care.rate).toBeUndefined()
    expect(r.training.medianSec).toBeUndefined()
    expect(r.walks.lost).toBe(0)
  })
})
