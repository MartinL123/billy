import { describe, expect, it } from 'vitest'
import { fogLayout } from './fogCanvas'
import { cellBounds } from './fog'

describe('brouillard en image', () => {
  it('l’image couvre les cases et une marge ; chaque trouée est au centre de sa case', () => {
    const layout = fogLayout(['100_200', '100_201', '102_200'])!
    expect(layout.width).toBe((2 + 40) * 8)
    expect(layout.height).toBe((3 + 40) * 8)
    const [s, w] = cellBounds('80_180')
    expect(layout.bbox[0]).toBeCloseTo(s, 9)
    expect(layout.bbox[1]).toBeCloseTo(w, 9)
    // La case 100_200 : 20 cases depuis l'ouest, et 22 rangées sous le nord (le nord est en haut de l'image).
    expect(layout.holes[0]).toEqual([20.5 * 8, 22.5 * 8])
    expect(layout.radius).toBe(10)
    expect(fogLayout([])).toBeUndefined()
  })

  it('l’image reste sous 4 096 pixels de côté', () => {
    const far = fogLayout(['0_0', '2000_3000'])!
    expect(Math.max(far.width, far.height)).toBeLessThanOrEqual(4096)
  })
})
