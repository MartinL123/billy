import { describe, expect, it } from 'vitest'
import { fitPadding } from './mapFrame'

const FRAME = { top: 130, bottom: 460, left: 40, right: 40 }

describe('marges du cadrage de la carte', () => {
  it('gardées telles quelles quand la carte est assez grande', () => {
    expect(fitPadding(FRAME, 390, 900)).toEqual(FRAME)
  })
  it('réduites sur un petit écran : la carte garde 30 % de place libre', () => {
    const p = fitPadding(FRAME, 375, 579)
    expect(p.top + p.bottom).toBeLessThanOrEqual(579 * 0.7)
    expect(p.top / p.bottom).toBeCloseTo(130 / 460, 1)
    expect(p.left).toBe(40)
  })
  it('sans taille connue (carte pas encore affichée) : inchangées', () => {
    expect(fitPadding(FRAME, 0, 0)).toEqual(FRAME)
  })
})
