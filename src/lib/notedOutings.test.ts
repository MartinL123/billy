import { describe, expect, it } from 'vitest'
import { notedOutings } from './notedOutings'

describe('T-121 · sortie repérée par l’iPhone', () => {
  it('garde la distance de la sortie confirmée de ce créneau, à cette heure', () => {
    const start = new Date(2026, 10, 7, 17, 20).toISOString()
    const days = [{ date: '2026-11-07', done: { soir: '17:20' }, noted: { soir: 30 }, detected: [{ start, end: start, meters: 1800, status: 'yes' as const, slot: 'soir' as const }] }]
    expect(notedOutings(days, [])[0]).toMatchObject({ slot: 'soir', minutes: 30, iphoneMeters: 1800 })
    expect(notedOutings([{ ...days[0]!, detected: [{ ...days[0]!.detected[0]!, status: 'no' as const }] }], [])[0]!.iphoneMeters).toBeUndefined()
  })
})
