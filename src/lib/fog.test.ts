import { describe, expect, it } from 'vitest'
import { cellArea, cellCenter, cellOf, cellsLabel, countFresh, discoveredShare, freshCells, inPolygon, knownFog, polygonArea, revealedCells, zoneOf } from './fog'

// Une balade inventée : 1 km tout droit vers le nord (aucun vrai lieu de Martin dans le dépôt).
const START = { lat: 47, lng: 2 }
const line = Array.from({ length: 101 }, (_, i) => ({ lat: 47 + (i * 0.009) / 100, lng: 2 }))

describe('le brouillard', () => {
  it('découvre les cases à 25 m ou moins du trajet', () => {
    const cells = revealedCells(line)
    // 1 km de long sur une bande de 50 m de large : environ 1 000 × 50 / (25 × 26,6) ≈ 75 cases, plus les bouts.
    expect(cells.size).toBeGreaterThan(65)
    expect(cells.size).toBeLessThan(100)
    expect(cells.has(cellOf(START))).toBe(true)
    // Une case à 200 m à l'est reste dans le brouillard.
    expect(cells.has(cellOf({ lat: 47.004, lng: 2.0027 }))).toBe(false)
  })

  it('une case n’est jamais comptée deux fois', () => {
    const first = revealedCells(line)
    const fresh = freshCells(first, new Set())
    expect(countFresh(fresh)).toBe(first.size)
    const known = knownFog([...fresh.values()].map((cells) => ({ cells })))
    expect(countFresh(freshCells(revealedCells(line), known))).toBe(0)
    // Refaire la même balade dans l'autre sens : rien de nouveau.
    expect(countFresh(freshCells(revealedCells([...line].reverse()), known))).toBe(0)
  })

  it('range les cases par zone de 0,05°', () => {
    // Un point bien à l'intérieur de la zone (47° tombe pile sur un bord).
    expect(zoneOf(cellOf({ lat: 47.001, lng: 2.001 }))).toBe(`${Math.floor(47 / 0.05)}_${Math.floor(2 / 0.05)}`)
    const c = cellCenter(cellOf(START))
    expect(Math.abs(c.lat - 47)).toBeLessThan(0.000225)
  })

  it('le pourcentage d’une commune', () => {
    // Une « commune » carrée de 1 km × 1 km autour du trajet.
    const ring = [
      { lat: 47, lng: 1.9934 },
      { lat: 47, lng: 2.0066 },
      { lat: 47.009, lng: 2.0066 },
      { lat: 47.009, lng: 1.9934 },
    ]
    const areaM2 = polygonArea(ring)
    expect(areaM2).toBeGreaterThan(0.95e6)
    expect(areaM2).toBeLessThan(1.05e6)
    expect(inPolygon({ lat: 47.004, lng: 2 }, ring)).toBe(true)
    expect(inPolygon({ lat: 47.02, lng: 2 }, ring)).toBe(false)
    const share = discoveredShare(revealedCells(line), { ring, areaM2, bbox: [47, 1.9934, 47.009, 2.0066] })
    // Une bande de ~50 m sur 1 km dans 1 km² : environ 5 %.
    expect(share).toBeGreaterThan(0.035)
    expect(share).toBeLessThan(0.07)
    expect(cellArea(cellOf(START))).toBeGreaterThan(500)
    expect(cellsLabel(56)).toBe('56 cases')
  })
})
