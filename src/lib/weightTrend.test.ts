import { describe, expect, it } from 'vitest'
import { weightTrend } from './weightTrend'

describe('weightTrend', () => {
  it('rien sans deux pesées', () => {
    expect(weightTrend([])).toBeNull()
    expect(weightTrend([{ date: '2026-10-01', kg: 12 }])).toBeNull()
  })

  it('prise de poids entre les deux dernières pesées, dans le désordre', () => {
    expect(
      weightTrend([
        { date: '2026-10-21', kg: 13.4 },
        { date: '2026-08-01', kg: 9 },
        { date: '2026-09-21', kg: 12.2 },
      ]),
    ).toBe('+1,2 kg en 30 jours')
  })

  it('perte de poids, un jour', () => {
    expect(weightTrend([{ date: '2026-10-20', kg: 13 }, { date: '2026-10-21', kg: 12.6 }])).toBe('−0,4 kg en 1 jour')
  })

  it('stable', () => {
    expect(weightTrend([{ date: '2026-10-09', kg: 13 }, { date: '2026-10-21', kg: 13.02 }])).toBe('Stable depuis 12 jours')
  })

  it('deux pesées le même jour : pas de phrase', () => {
    expect(weightTrend([{ date: '2026-10-21', kg: 13 }, { date: '2026-10-21', kg: 13.5 }])).toBeNull()
  })
})
