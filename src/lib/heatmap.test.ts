import { describe, expect, it } from 'vitest'
import { heatPoints, resample } from './heatmap'
import { distanceMeters } from './community'
import type { RoutePoint } from './route'

// Une ligne droite d’environ 1 km vers l’est (lieu inventé).
const A: RoutePoint = [48.8, 2.3]
const B: RoutePoint = [48.8, 2.3 + 1000 / (111_320 * Math.cos((48.8 * Math.PI) / 180))]
const ll = ([lat, lng]: RoutePoint) => ({ lat, lng })

describe('« Lieux les plus fréquentés » (T-109)', () => {
  it('reprend un tracé tous les 25 m, quel que soit le nombre de points du GPS', () => {
    const few = resample([A, B])
    const many = resample(Array.from({ length: 1001 }, (_, i): RoutePoint => [A[0], A[1] + ((B[1] - A[1]) * i) / 1000]))
    expect(few.length).toBeGreaterThanOrEqual(40)
    expect(few.length).toBeLessThanOrEqual(42)
    expect(Math.abs(many.length - few.length)).toBeLessThanOrEqual(1)
    expect(distanceMeters(ll(few[0]!), ll(few[1]!))).toBeCloseTo(25, 0)
  })

  it('deux passages au même endroit comptent deux fois ; un tracé vide ou immobile ne donne rien de plus', () => {
    expect(heatPoints([[A, B], [A, B]]).length).toBe(2 * resample([A, B]).length)
    expect(heatPoints([])).toEqual([])
    expect(resample([A, A, A])).toEqual([A])
  })

  it('plafonne le nombre de points en gardant la répartition', () => {
    const out = heatPoints([[A, B]], 10)
    expect(out.length).toBeLessThanOrEqual(10)
    expect(out[0]).toEqual(A)
  })
})
