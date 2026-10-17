import { describe, expect, it } from 'vitest'
import { cellsAlong, fogShape, countCells, encodeGeohash, geohashBounds, knownCells, newCells, zoneBones, zonesLabel } from './exploration'

describe('exploration', () => {
  it('encode un geohash connu et retrouve sa cellule', () => {
    // Exemple de référence : 57.64911, 10.40744 → u4pruydqqvj
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj')
    const hash = encodeGeohash(48.8566, 2.3522)
    expect(hash).toHaveLength(8)
    const [s, w, n, e] = geohashBounds(hash)
    expect(48.8566).toBeGreaterThanOrEqual(s)
    expect(48.8566).toBeLessThanOrEqual(n)
    expect(2.3522).toBeGreaterThanOrEqual(w)
    expect(2.3522).toBeLessThanOrEqual(e)
    // Une cellule de précision 8 : quelques dizaines de mètres.
    expect((n - s) * 111000).toBeLessThan(25)
    expect((e - w) * 73000).toBeLessThan(40)
  })

  it('découvre les cellules le long d’un tracé, sans trou', () => {
    // 200 m vers le nord : une dizaine de cellules d'environ 19 m de haut.
    const cells = cellsAlong([
      [48.8566, 2.3522],
      [48.8584, 2.3522],
    ])
    expect(cells.size).toBeGreaterThanOrEqual(10)
    expect(cells.size).toBeLessThan(25)
  })

  it('ne compte que les nouvelles cellules, rangées par carré', () => {
    const found = new Set(['u09tvw0a', 'u09tvw0b', 'u09tvx00'])
    const known = knownCells([{ id: 'u09tv', cells: ['w0a'] }])
    expect(known.has('u09tvw0a')).toBe(true)
    const fresh = newCells(found, known)
    expect(fresh).toEqual(new Map([['u09tv', ['w0b', 'x00']]]))
    expect(countCells(fresh)).toBe(2)
  })

  it('os : 1 par zone, 50 au plus par balade', () => {
    expect(zoneBones(12)).toBe(12)
    expect(zoneBones(400)).toBe(50)
    expect(zonesLabel(1)).toBe('1 zone découverte')
    expect(zonesLabel(1230)).toMatch(/^1\s230 zones découvertes$/)
  })
})

describe('brouillard', () => {
  it('un trou par rangée de cellules voisines', () => {
    const a = encodeGeohash(48.8566, 2.3522)
    const [s, , , e] = geohashBounds(a)
    const right = encodeGeohash((s + geohashBounds(a)[2]) / 2, e + 0.00001)
    const far = encodeGeohash(48.87, 2.36)
    const { polygon, centers } = fogShape(new Set([a, right, far]))
    expect(polygon.coordinates).toHaveLength(1 + 2)
    expect(centers).toHaveLength(3)
    expect(fogShape(new Set()).polygon.coordinates).toHaveLength(1)
  })
})
