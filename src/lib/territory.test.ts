import { describe, expect, it } from 'vitest'
import { sharePercent, territoryHint, walkLineDetails } from './territory'

describe('panneau des Balades (T-054)', () => {
  it('le pourcentage découvert, en grand', () => {
    expect(sharePercent(0)).toBe('0 %')
    expect(sharePercent(0.004)).toBe('< 1 %')
    expect(sharePercent(0.042)).toBe('4 %')
    expect(sharePercent(1.2)).toBe('100 %')
  })

  it('la phrase : une invitation, puis la balade touchée', () => {
    expect(territoryHint(undefined, '2026-10-20')).toBe('Chaque balade lève le brouillard. Touchez-en une pour l’ouvrir.')
    expect(territoryHint({ date: '2026-10-19', route: { distanceM: 2400, durationMin: 35 } }, '2026-10-20')).toBe('Hier · 2,4 km · 35 min. Touchez la carte ailleurs pour revoir toutes ses balades.')
  })
})

describe('tracé touché sur la carte (T-098)', () => {
  it('la ligne : la date courte et la distance ; l’année seulement si elle diffère', () => {
    expect(walkLineDetails({ date: '2026-10-22', route: { distanceM: 2100 } }, '2026-10-22')).toBe('22 oct. · 2,1 km')
    expect(walkLineDetails({ date: '2025-12-03', route: { distanceM: 800 } }, '2026-10-22')).toBe('3 déc. 2025 · 800 m')
  })
})
