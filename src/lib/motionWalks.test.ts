import { describe, expect, it } from 'vitest'
import { aroundHour, keptDismissed, mergePeriods, motionPeriodId, motionSentence, motionSuggestion, type MotionPeriod } from './motionWalks'
import { DEFAULT_WALK_TIMES } from './walks'

// Heures locales (celles de l'iPhone) : les tests ne dépendent pas du fuseau de la machine.
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m)
const iso = (day: number, h: number, m = 0) => at(day, h, m).toISOString()
const period = (day: number, h1: number, m1: number, h2: number, m2: number): MotionPeriod => ({ start: iso(day, h1, m1), end: iso(day, h2, m2) })

const now = at(22, 12, 0)
const base = { now, entries: [], walks: [], times: DEFAULT_WALK_TIMES, dismissed: [] }

describe('mergePeriods', () => {
  it('recolle les périodes à moins de 2 min, écarte les illisibles', () => {
    const merged = mergePeriods([period(22, 8, 20, 8, 30), period(22, 8, 0, 8, 19), { start: 'x', end: 'y' }, period(22, 8, 40, 8, 50)])
    expect(merged).toEqual([
      { start: at(22, 8, 0).getTime(), end: at(22, 8, 30).getTime() },
      { start: at(22, 8, 40).getTime(), end: at(22, 8, 50).getTime() },
    ])
  })
})

describe('motionSuggestion', () => {
  it('propose la marche la plus récente de 10 min ou plus', () => {
    const s = motionSuggestion({ ...base, periods: [period(21, 19, 0, 19, 30), period(22, 8, 3, 8, 38), period(22, 10, 0, 10, 6)] })
    expect(s).toMatchObject({ id: '2026-10-22T08:03', minutes: 35, date: '2026-10-22', slot: 'matin', time: '08:03' })
  })

  it('ignore une marche trop courte, encore en cours, ou trop ancienne', () => {
    expect(motionSuggestion({ ...base, periods: [period(22, 8, 0, 8, 9)] })).toBeUndefined()
    expect(motionSuggestion({ ...base, periods: [period(22, 11, 30, 11, 58)] })).toBeUndefined()
    expect(motionSuggestion({ ...base, periods: [period(15, 8, 0, 8, 30)] })).toBeUndefined()
    expect(motionSuggestion({ ...base, periods: [period(16, 8, 0, 8, 30)] })?.date).toBe('2026-10-16')
  })

  it('ignore une marche sans sortie à son heure (la nuit)', () => {
    expect(motionSuggestion({ ...base, periods: [period(22, 3, 0, 3, 30)] })).toBeUndefined()
  })

  it('ignore une marche couverte par une balade, une sortie notée ou un « Non »', () => {
    const periods = [period(22, 8, 0, 8, 30)]
    expect(motionSuggestion({ ...base, periods, entries: [{ route: { startTime: iso(22, 8, 2), endTime: iso(22, 8, 25) } }] })).toBeUndefined()
    expect(motionSuggestion({ ...base, periods, entries: [{ route: { startTime: iso(22, 7, 40), durationMin: 18 } }] })).toBeUndefined()
    expect(motionSuggestion({ ...base, periods, entries: [{ route: { startTime: iso(22, 9, 0), endTime: iso(22, 9, 30) } }] })?.id).toBe('2026-10-22T08:00')
    expect(motionSuggestion({ ...base, periods, walks: [{ date: '2026-10-22', done: { matin: '08:10' } }] })).toBeUndefined()
    expect(motionSuggestion({ ...base, periods, dismissed: ['2026-10-22T08:00'] })).toBeUndefined()
  })

  it('passe à la précédente quand la plus récente est écartée', () => {
    const s = motionSuggestion({ ...base, periods: [period(21, 19, 0, 19, 30), period(22, 8, 0, 8, 30)], dismissed: [motionPeriodId(at(22, 8, 0).getTime())] })
    expect(s?.date).toBe('2026-10-21')
    expect(s?.slot).toBe('soir')
  })
})

describe('textes', () => {
  it('arrondit au quart d’heure', () => {
    expect(aroundHour('08:03')).toBe('vers 8 h')
    expect(aroundHour('08:40')).toBe('vers 8 h 45')
    expect(aroundHour('08:55')).toBe('vers 9 h')
  })

  it('dit le jour quand ce n’est pas aujourd’hui', () => {
    expect(motionSentence({ minutes: 35, date: '2026-10-22', time: '08:03' }, '2026-10-22')).toBe('Vous avez marché 35 min vers 8 h.')
    expect(motionSentence({ minutes: 35, date: '2026-10-21', time: '19:10' }, '2026-10-22')).toBe('Vous avez marché 35 min hier vers 19 h 15.')
    expect(motionSentence({ minutes: 75, date: '2026-10-20', time: '08:00' }, '2026-10-22')).toBe('Vous avez marché 1 h 15 mardi vers 8 h.')
  })

  it('ne garde que les « Non » des 14 derniers jours', () => {
    expect(keptDismissed(['2026-10-01T08:00', '2026-10-08T08:00', '2026-10-20T08:00'], now)).toEqual(['2026-10-08T08:00', '2026-10-20T08:00'])
  })
})
