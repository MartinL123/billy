import { describe, expect, it } from 'vitest'
import { canMarkDone, healthStatus, lateCare, nextThing, weekOf, whenLine } from './healthScreen'

const TODAY = '2026-10-19' // un lundi

describe('écran Santé V5 (T-053)', () => {
  it('le calendrier replié sur la semaine : lundi → dimanche', () => {
    expect(weekOf(TODAY)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
    expect(weekOf('2026-10-25')[0]).toBe('2026-10-19')
  })

  it('« C’est fait » seulement le jour J ou en retard', () => {
    expect(canMarkDone('2026-10-19', TODAY)).toBe(true)
    expect(canMarkDone('2026-10-16', TODAY)).toBe(true)
    expect(canMarkDone('2027-01-10', TODAY)).toBe(false)
    expect(canMarkDone('', TODAY)).toBe(false)
  })

  it('la phrase d’état', () => {
    const events = [{ date: '2027-01-10', done: false }, { date: '2026-10-01', done: true }]
    expect(healthStatus(events, TODAY)).toBe('Tout est à jour. Rien à prévoir avant le 10 janvier 2027.')
    expect(healthStatus([...events, { date: '2026-10-16', done: false }], TODAY)).toBe('Une chose à faire, le reste est à jour.')
    expect(healthStatus([], TODAY)).toBe('Tout est à jour. Rien de prévu pour l’instant.')
  })

  it('retards en tête, prochaine chose hors retards, date en clair', () => {
    const events = [{ id: 'a', date: '2026-10-16', done: false }, { id: 'b', date: '2027-01-10', done: false }]
    expect(lateCare(events, TODAY).map((e) => e.id)).toEqual(['a'])
    expect(nextThing(events, TODAY)?.id).toBe('b')
    expect(whenLine('2027-01-10', TODAY)).toBe('Dimanche 10 janvier 2027 · dans 83 jours')
  })
})
