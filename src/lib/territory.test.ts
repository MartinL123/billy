import { describe, expect, it } from 'vitest'
import { sharePercent, territoryHint } from './territory'

describe('panneau des Balades (T-054)', () => {
  it('le pourcentage découvert, en grand', () => {
    expect(sharePercent(0)).toBe('0 %')
    expect(sharePercent(0.004)).toBe('< 1 %')
    expect(sharePercent(0.042)).toBe('4 %')
    expect(sharePercent(1.2)).toBe('100 %')
  })

  it('la phrase : une invitation, puis la balade touchée', () => {
    expect(territoryHint(undefined, '2026-10-20')).toBe('Chaque balade lève le brouillard. Touchez-en une pour la revoir.')
    expect(territoryHint({ date: '2026-10-19', route: { distanceM: 2400, durationMin: 35 } }, '2026-10-20')).toBe('Hier · 2,4 km · 35 min. Touchez-la encore pour revoir toutes ses balades.')
  })
})
