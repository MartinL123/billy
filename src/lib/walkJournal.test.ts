import { describe, expect, it } from 'vitest'
import { dayLabel, journalDays, memoLine, walkPills } from './walkJournal'

const nb = (t: string) => t.replace(/ /g, ' ')
const walk = (id: string, date: string, startTime?: string) => ({ id, date, route: { points: [], distanceM: 1000, moments: [], ...(startTime ? { startTime } : {}) } })

describe('le journal des balades, groupé par jour (T-097)', () => {
  const today = '2026-10-22'
  it('« Aujourd’hui », « Hier », puis le jour en toutes lettres (l’année si elle change)', () => {
    expect(dayLabel('2026-10-22', today)).toBe('Aujourd’hui')
    expect(dayLabel('2026-10-21', today)).toBe('Hier')
    expect(dayLabel('2026-10-20', today)).toBe('Mardi 20 octobre')
    expect(dayLabel('2025-12-30', today)).toBe('Mardi 30 décembre 2025')
  })

  it('les jours du plus récent au plus ancien ; dans un jour, du plus récent au plus ancien ; les souvenirs seulement les jours de balade', () => {
    const days = journalDays(
      [walk('soir', '2026-10-21', '2026-10-21T17:00:00Z'), walk('matin', '2026-10-22', '2026-10-22T07:00:00Z'), walk('midi', '2026-10-20'), walk('hier-matin', '2026-10-21', '2026-10-21T06:00:00Z')],
      [
        { id: 'sieste', date: '2026-10-22', text: 'Il a dormi sur mes pieds', createdAt: '2026-10-22T12:00:00Z' },
        { id: 'seul', date: '2026-10-19', text: 'Un jour sans balade' },
      ],
      today,
    )
    expect(days.map((d) => d.label)).toEqual(['Aujourd’hui', 'Hier', 'Mardi 20 octobre'])
    expect(days.map((d) => d.rows.map((r) => (r.kind === 'balade' ? r.walk.id : r.memo.id)))).toEqual([['sieste', 'matin'], ['soir', 'hier-matin'], ['midi']])
  })

  it('la petite ligne d’un souvenir et les pastilles d’une balade', () => {
    expect(memoLine({})).toBe('Souvenir')
    const at = new Date(2026, 9, 22, 14, 0).toISOString()
    expect(nb(memoLine({ createdAt: at }))).toBe('Souvenir · 14 h')
    const pills = walkPills({
      moments: [
        { lat: 0, lng: 0, type: 'jeu' },
        { lat: 0, lng: 0, type: 'peur' },
        { lat: 0, lng: 0, type: 'jeu' },
        { lat: 0, lng: 0, type: 'araconter' },
        { lat: 0, lng: 0, type: 'marque', street: 'Parc des Tilleuls' },
      ],
    })
    expect(pills).toEqual([
      { label: 'Jeu', hard: false },
      { label: 'Moment de stress', hard: true },
      { label: 'Pipi · Parc des Tilleuls', hard: false },
    ])
  })
})
