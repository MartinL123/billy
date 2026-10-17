import { describe, expect, it } from 'vitest'
import { bearing, cumulative, easeInOut, pointAlong, turnToward } from './replay'
import type { RoutePoint } from './route'

const A: RoutePoint = [48.85, 2.35]
const B: RoutePoint = [48.86, 2.35] // ~1,1 km au nord
const C: RoutePoint = [48.86, 2.36] // puis ~730 m à l'est

describe('revoir la balade', () => {
  it('avance le long du tracé', () => {
    const cum = cumulative([A, B, C])
    expect(cum[0]).toBe(0)
    expect(cum[1]).toBeGreaterThan(1100)
    expect(pointAlong([A, B, C], cum, 0)).toEqual(A)
    expect(pointAlong([A, B, C], cum, cum[1]! / 2)[0]).toBeCloseTo(48.855, 5)
    expect(pointAlong([A, B, C], cum, 1e9)).toEqual(C)
  })

  it('le cap et la rotation par le plus court chemin', () => {
    expect(bearing(A, B)).toBeCloseTo(0, 0)
    expect(bearing(B, C)).toBeCloseTo(90, 0)
    expect(turnToward(350, 10, 0.5)).toBeCloseTo(0, 6)
    expect(turnToward(10, 350, 1)).toBeCloseTo(350, 6)
  })

  it('démarre et finit en douceur', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(0.5)).toBe(0.5)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.1)).toBeLessThan(0.1)
  })
})
