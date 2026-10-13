import { describe, expect, it } from 'vitest'
import { activeDays, daysTogether, sessionsThisWeek, successesThisWeek, weekId, weekOf } from './rhythm'

describe('rythme hebdomadaire', () => {
  it('va du lundi au dimanche', () => {
    expect(weekOf('2026-10-13')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'])
    expect(weekId('2026-10-18')).toBe('2026-10-12')
    expect(weekId('2026-10-19')).toBe('2026-10-19')
    expect(weekOf('2027-01-01')[0]).toBe('2026-12-28')
  })

  it('ne retient que les jours de la semaine en cours', () => {
    const sessions = [{ date: '2026-10-11' }, { date: '2026-10-12' }, { date: '2026-10-12' }, { date: '2026-10-14' }]
    const exposures = [{ date: '2026-10-16' }]
    expect([...activeDays('2026-10-13', sessions, exposures)].sort()).toEqual(['2026-10-12', '2026-10-14', '2026-10-16'])
    expect(sessionsThisWeek('2026-10-13', sessions)).toBe(3)
  })

  it('compte les jours d’entraînement ensemble, sans jamais repartir de zéro', () => {
    expect(daysTogether([{ date: '2026-09-01' }, { date: '2026-09-01' }], [{ date: '2026-10-13' }])).toBe(2)
    expect(daysTogether([], [])).toBe(0)
  })

  it('compte les réussites d’un boss cette semaine', () => {
    const sessions = [
      { date: '2026-10-12', bossId: 'lien', trials: [true, true, false, true, true] },
      { date: '2026-10-13', bossId: 'lien', trials: [true, false, false, false, false] },
      { date: '2026-10-13', bossId: 'ville', trials: [true, true, true, true, true] },
      { date: '2026-10-05', bossId: 'lien', trials: [true, true, true, true, true] },
    ]
    expect(successesThisWeek('2026-10-13', sessions, 'lien')).toBe(5)
  })
})
