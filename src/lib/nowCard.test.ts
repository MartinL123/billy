import { describe, expect, it } from 'vitest'
import { nowCard, type NowInput } from './nowCard'

const at = (h: number, m = 0) => h * 60 + m
const base: NowInput = {
  today: '2026-10-17',
  now: at(10),
  care: [{ id: 'ap', title: 'Antiparasitaire puces et tiques', type: 'antiparasitaire', date: '2026-10-25', done: false }],
  meals: [{ time: '08:00' }, { time: '19:30' }],
  mission: { done: false, minutes: 3 },
  walks: { times: { matin: '08:00', midi: '13:00', soir: '19:00' }, done: { matin: '08:10' } },
}

describe('la carte du moment (V5, T-050) : la première règle qui s’applique', () => {
  it('une balade de l’iPhone en cours passe avant tout', () => {
    const input = { ...base, care: [{ ...base.care[0]!, date: '2026-10-10' }], walking: { startedAt: '2026-10-17T15:20:00Z', recording: false } }
    expect(nowCard(input)).toEqual({ kind: 'balade', startedAt: '2026-10-17T15:20:00Z', recording: false })
  })

  it('1. un soin dû aujourd’hui ou en retard', () => {
    expect(nowCard({ ...base, care: [{ ...base.care[0]!, date: '2026-10-17' }] })).toMatchObject({ kind: 'soin', event: { id: 'ap' } })
    expect(nowCard({ ...base, care: [{ ...base.care[0]!, date: '2026-10-12' }] })).toMatchObject({ kind: 'soin' })
  })

  it('2. un repas dans les 30 minutes', () => {
    expect(nowCard({ ...base, now: at(19, 5) })).toEqual({ kind: 'repas', time: '19:30' })
  })

  it('3. une sortie entre 30 min avant et 1 h après son heure, pas encore notée', () => {
    expect(nowCard({ ...base, now: at(12, 30) })).toEqual({ kind: 'sortie', slot: 'midi', time: '13:00' })
    expect(nowCard({ ...base, now: at(14) })).toEqual({ kind: 'sortie', slot: 'midi', time: '13:00' })
    // Trop tôt, trop tard ou déjà notée : la mission.
    expect(nowCard({ ...base, now: at(12, 20) }).kind).toBe('mission')
    expect(nowCard({ ...base, now: at(14, 5) }).kind).toBe('mission')
    expect(nowCard({ ...base, now: at(8, 20) }).kind).toBe('mission')
  })

  it('4. la mission du jour si elle n’est pas faite', () => {
    expect(nowCard(base).kind).toBe('mission')
  })

  it('la pesée du mois, une fois la mission faite', () => {
    expect(nowCard({ ...base, mission: { done: true, minutes: 3 }, weighing: { due: true } }).kind).toBe('pesee')
  })

  it('5. après 21 h, rien de noté aujourd’hui : « Racontez sa journée »', () => {
    const evening = { ...base, now: at(21, 30), meals: [], mission: { done: true, minutes: 3 } }
    expect(nowCard(evening).kind).toBe('soiree')
    expect(nowCard({ ...evening, notedToday: true }).kind).toBe('fini')
    expect(nowCard({ ...evening, now: at(20, 30) }).kind).toBe('fini')
  })

  it('6. sinon « tout est fait »', () => {
    expect(nowCard({ ...base, now: at(16), mission: { done: true, minutes: 3 } })).toEqual({ kind: 'fini' })
  })
})
