import { describe, expect, it } from 'vitest'
import { memoryDates, onThisDay } from './memories'

describe('Ce jour-là', () => {
  const entries = [
    { id: 'semaine', date: '2026-10-06' },
    { id: 'mois', date: '2026-09-13' },
    { id: 'autre', date: '2026-09-14' },
    { id: 'an', date: '2025-10-13' },
    { id: 'aujourdhui', date: '2026-10-13' },
  ]

  it('retrouve les souvenirs d’il y a une semaine, un mois, un an', () => {
    expect(onThisDay(entries, '2026-10-13').map((m) => [m.label, m.entry.id])).toEqual([
      ['Il y a 1 semaine', 'semaine'],
      ['Il y a 1 mois', 'mois'],
      ['Il y a 1 an', 'an'],
    ])
  })

  it('ne propose rien un jour sans souvenir', () => {
    expect(onThisDay(entries, '2026-10-20')).toEqual([{ label: 'Il y a 1 semaine', entry: entries[4] }])
    expect(onThisDay(entries, '2026-12-25')).toEqual([])
  })

  it('ne répète pas un souvenir de fin de mois deux jours de suite', () => {
    const dates = (today: string) => memoryDates(today, 1).map((d) => d.date)
    expect(dates('2026-07-30')).toContain('2026-06-30')
    expect(dates('2026-07-31')).not.toContain('2026-06-30')
    expect(dates('2026-07-31')).toContain('2026-01-31')
  })
})
