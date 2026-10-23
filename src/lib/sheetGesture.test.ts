import { describe, expect, it } from 'vitest'
import { moveList, movePanel, releaseSpeed, sheetGesture } from './sheetGesture'

// R-099 : le geste sur le panneau de la carte (cran haut à y = 0, moitié à 400, réduit à 700).
describe('sheetGesture', () => {
  it('au cran du milieu, le doigt qui monte déplace le panneau', () => {
    expect(sheetGesture({ owner: null, y: 400, scrollTop: 0, dx: 0, dy: -10, step: -10 })).toBe('panel')
    expect(sheetGesture({ owner: 'panel', y: 300, scrollTop: 0, dx: 0, dy: -110, step: -20 })).toBe('panel')
  })

  it('arrivé au cran haut, le doigt qui monte encore fait défiler la liste, dans le même geste', () => {
    expect(sheetGesture({ owner: 'panel', y: 0, scrollTop: 0, dx: 0, dy: -420, step: -20 })).toBe('list')
    expect(sheetGesture({ owner: 'list', y: 0, scrollTop: 40, dx: 0, dy: -460, step: -20 })).toBe('list')
  })

  it('arrivé en haut, le doigt qui redescend aussitôt reprend le panneau', () => {
    expect(sheetGesture({ owner: 'panel', y: 0, scrollTop: 0, dx: 0, dy: -400, step: 8 })).toBe('panel')
  })

  it('au cran haut, une liste défilée défile vers le bas comme vers le haut', () => {
    expect(sheetGesture({ owner: null, y: 0, scrollTop: 120, dx: 0, dy: 10, step: 10 })).toBe('list')
    expect(sheetGesture({ owner: null, y: 0, scrollTop: 120, dx: 0, dy: -10, step: -10 })).toBe('list')
    expect(sheetGesture({ owner: null, y: 0, scrollTop: 0, dx: 0, dy: -10, step: -10 })).toBe('list')
  })

  it('au cran haut, tout en haut de la liste, le doigt qui descend fait descendre le panneau', () => {
    expect(sheetGesture({ owner: null, y: 0, scrollTop: 0, dx: 0, dy: 10, step: 10 })).toBe('panel')
    // La liste remonte jusqu’en haut, puis le panneau prend la suite sans lever le doigt.
    expect(sheetGesture({ owner: 'list', y: 0, scrollTop: 0, dx: 0, dy: 200, step: 12 })).toBe('panel')
    expect(sheetGesture({ owner: 'list', y: 0, scrollTop: 30, dx: 0, dy: 170, step: 12 })).toBe('list')
  })

  it('réduit, le panneau prend le geste dans les deux sens', () => {
    expect(sheetGesture({ owner: null, y: 700, scrollTop: 0, dx: 0, dy: -8, step: -8 })).toBe('panel')
    expect(sheetGesture({ owner: null, y: 700, scrollTop: 0, dx: 1, dy: 8, step: 8 })).toBe('panel')
  })

  it('un toucher (moins de 6 px) ne décide rien : la carte touchée s’ouvre', () => {
    expect(sheetGesture({ owner: null, y: 400, scrollTop: 0, dx: 3, dy: -5, step: -5 })).toBeNull()
    expect(sheetGesture({ owner: null, y: 0, scrollTop: 50, dx: 0, dy: 2, step: 2 })).toBeNull()
  })

  it('un geste horizontal reste à la rangée qui défile', () => {
    expect(sheetGesture({ owner: null, y: 400, scrollTop: 0, dx: -20, dy: 4, step: 4 })).toBe('none')
    expect(sheetGesture({ owner: 'none', y: 400, scrollTop: 0, dx: -20, dy: 40, step: 30 })).toBe('none')
  })
})

describe('movePanel', () => {
  it('suit le doigt, s’arrête au cran haut et rend le reste à la liste', () => {
    expect(movePanel(400, -30, 700)).toEqual({ raw: 370, y: 370, rest: 0 })
    expect(movePanel(10, -30, 700)).toEqual({ raw: 0, y: 0, rest: -20 })
  })
  it('résiste sous le cran réduit', () => {
    expect(movePanel(700, 30, 700)).toEqual({ raw: 730, y: 710, rest: 0 })
  })
})

describe('moveList', () => {
  it('défile à la main et rend au panneau ce qui dépasse le haut', () => {
    expect(moveList(0, -20, 500)).toEqual({ scrollTop: 20, rest: 0 })
    expect(moveList(10, 25, 500)).toEqual({ scrollTop: 0, rest: 15 })
    expect(moveList(490, -20, 500)).toEqual({ scrollTop: 500, rest: 0 })
  })
})

describe('releaseSpeed', () => {
  it('mesure la vitesse sur les derniers mouvements', () => {
    expect(releaseSpeed([])).toBe(0)
    expect(releaseSpeed([{ y: 0, t: 0 }, { y: 100, t: 400 }, { y: 150, t: 450 }, { y: 200, t: 500 }])).toBe(1)
  })
})
