import { describe, expect, it } from 'vitest'
import { nextAnnual, nextOccurrence } from './recurrence'
import { upcoming } from './events'

describe('nextOccurrence', () => {
  it('ne crée rien sans récurrence ni sans date', () => {
    expect(nextOccurrence('2026-10-17', 'none')).toBeUndefined()
    expect(nextOccurrence('', 'yearly')).toBeUndefined()
  })

  it('avance d’un mois, de trois mois, d’un an', () => {
    expect(nextOccurrence('2026-10-17', 'monthly')).toBe('2026-11-17')
    expect(nextOccurrence('2026-10-17', 'quarterly')).toBe('2027-01-17')
    expect(nextOccurrence('2026-10-17', 'yearly')).toBe('2027-10-17')
    expect(nextOccurrence('2026-12-05', 'monthly')).toBe('2027-01-05')
  })

  it('reste dans le mois visé en fin de mois', () => {
    expect(nextOccurrence('2027-01-31', 'monthly')).toBe('2027-02-28')
    expect(nextOccurrence('2028-01-31', 'monthly')).toBe('2028-02-29')
    expect(nextOccurrence('2026-11-30', 'quarterly')).toBe('2027-02-28')
    expect(nextOccurrence('2028-02-29', 'yearly')).toBe('2029-02-28')
  })
})

describe('nextAnnual', () => {
  it('donne la prochaine date, aujourd’hui inclus', () => {
    expect(nextAnnual(5, 13, '2026-10-13')).toBe('2027-05-13')
    expect(nextAnnual(11, 2, '2026-10-13')).toBe('2026-11-02')
    expect(nextAnnual(10, 13, '2026-10-13')).toBe('2026-10-13')
    expect(nextAnnual(2, 29, '2026-03-01')).toBe('2027-02-28')
  })
})

describe('upcoming', () => {
  it('met les retards en premier et ignore les faits et les non datés', () => {
    const events = [
      { id: 'a', date: '2026-10-20', done: false },
      { id: 'b', date: '2026-10-12', done: false },
      { id: 'c', date: '2026-10-01', done: true },
      { id: 'd', date: '', done: false },
      { id: 'e', date: '2026-10-13', done: false },
      { id: 'f', date: '2026-09-30', done: false },
    ]
    expect(upcoming(events, '2026-10-13').map((e) => e.id)).toEqual(['f', 'b', 'e', 'a'])
  })
})
