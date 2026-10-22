import { describe, expect, it } from 'vitest'
import { walkLineDetails } from './territory'

describe('tracé touché sur la carte (T-098)', () => {
  it('la ligne : la date courte et la distance ; l’année seulement si elle diffère', () => {
    expect(walkLineDetails({ date: '2026-10-22', route: { distanceM: 2100 } }, '2026-10-22')).toBe('22 oct. · 2,1 km')
    expect(walkLineDetails({ date: '2025-12-03', route: { distanceM: 800 } }, '2026-10-22')).toBe('3 déc. 2025 · 800 m')
  })
})
