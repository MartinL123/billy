import { describe, expect, it } from 'vitest'
import { nearestSnap, sheetPositions, SNAP_GAP } from './sheetSnap'

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

describe('cran du milieu calculé sur le contenu (R-091, R-082)', () => {
  // Carte de 760 px, panneau de 700 px (sous les boutons de la carte).
  const base = { height: 700, container: 760, peekBottom: 90 }

  it('sans contenu à montrer : la moitié de la carte', () => {
    expect(sheetPositions(base)).toEqual({ full: 0, half: 320, collapsed: 700 - 90 - SNAP_GAP })
  })

  it('les premières actions entières au-dessus du rond Accueil ou de l’action fixée', () => {
    const p = sheetPositions({ ...base, halfBottom: 450, bottomInset: 36 })
    // Partie visible = 700 − half : le bas des actions + 36 + l’air.
    expect(700 - p.half).toBe(450 + 36 + SNAP_GAP)
    expect(p.collapsed).toBe(700 - 90 - SNAP_GAP - 36)
  })

  it('peu de contenu : la moitié reste le minimum', () => {
    expect(sheetPositions({ ...base, halfBottom: 120, bottomInset: 36 }).half).toBe(320)
  })

  it('petit écran, grand texte : le cran du milieu rejoint le haut, jamais au-delà ; réduit jamais au-dessus', () => {
    const p = sheetPositions({ height: 420, container: 480, peekBottom: 140, halfBottom: 600, bottomInset: 120 })
    expect(p.half).toBe(0)
    expect(p.collapsed).toBeGreaterThanOrEqual(p.half)
  })
})
