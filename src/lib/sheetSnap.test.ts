import { describe, expect, it } from 'vitest'
import { nearestSnap } from './sheetSnap'

const positions = { full: 0, half: 300, collapsed: 560 }

describe('panneau de la carte à trois crans (R-077)', () => {
  it('sans élan : le cran le plus proche', () => {
    expect(nearestSnap(positions, 40, 0)).toBe('full')
    expect(nearestSnap(positions, 260, 0.1)).toBe('half')
    expect(nearestSnap(positions, 500, -0.1)).toBe('collapsed')
  })
  it('geste rapide : le cran suivant dans son sens', () => {
    expect(nearestSnap(positions, 280, -0.8)).toBe('full')
    expect(nearestSnap(positions, 320, 0.8)).toBe('collapsed')
    expect(nearestSnap(positions, 20, 0.8)).toBe('half')
    expect(nearestSnap(positions, 540, -0.8)).toBe('half')
  })
  it('aux bords, il reste au dernier cran', () => {
    expect(nearestSnap(positions, -30, -0.9)).toBe('full')
    expect(nearestSnap(positions, 600, 0.9)).toBe('collapsed')
  })
})
