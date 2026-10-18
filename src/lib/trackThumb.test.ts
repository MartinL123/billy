import { describe, expect, it } from 'vitest'
import { trackThumb } from './trackThumb'

describe('aperçu des tracés (T-035)', () => {
  it('rien à dessiner sans balade', () => {
    expect(trackThumb([], 96)).toEqual([])
    expect(trackThumb([[[48.6, -2.1]]], 96)).toEqual([])
  })

  it('un tracé tient dans le carré, marges comprises', () => {
    const [d] = trackThumb(
      [
        [
          [48.6, -2.1],
          [48.61, -2.1],
          [48.61, -2.08],
        ],
      ],
      96,
    )
    const numbers = d!.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(8)
    expect(Math.max(...numbers)).toBeLessThanOrEqual(88)
    expect(d!.startsWith('M')).toBe(true)
  })

  it('les balades loin de la dernière ne sont pas dessinées', () => {
    const here: [number, number][] = [
      [48.6, -2.1],
      [48.601, -2.1],
    ]
    const far: [number, number][] = [
      [43.3, 5.4],
      [43.31, 5.4],
    ]
    expect(trackThumb([here, far], 96)).toHaveLength(1)
  })
})
