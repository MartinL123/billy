import { distanceMeters } from './community'
import type { RoutePoint } from './route'

// L'exploration (brouillard) : la carte est découpée en cellules geohash de précision 8 (environ 38 × 19 m).
// Chaque balade découvre les cellules qu'elle traverse. On compte des zones, jamais des kilomètres.

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'
export const CELL_PRECISION = 8
/** Les cellules sont rangées par carré de précision 5 (environ 5 km) : un document Firestore chacun. */
export const BLOCK_PRECISION = 5
/** Os par zone découverte, et plafond par balade (le premier import ne doit pas tout rafler). */
export const BONES_PER_ZONE = 1
export const MAX_ZONE_BONES = 50

export function encodeGeohash(lat: number, lng: number, precision = CELL_PRECISION): string {
  let latMin = -90
  let latMax = 90
  let lngMin = -180
  let lngMax = 180
  let hash = ''
  let bit = 0
  let value = 0
  let even = true
  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2
      if (lng >= mid) {
        value = value * 2 + 1
        lngMin = mid
      } else {
        value *= 2
        lngMax = mid
      }
    } else {
      const mid = (latMin + latMax) / 2
      if (lat >= mid) {
        value = value * 2 + 1
        latMin = mid
      } else {
        value *= 2
        latMax = mid
      }
    }
    even = !even
    if (++bit === 5) {
      hash += BASE32[value]
      bit = 0
      value = 0
    }
  }
  return hash
}

/** Le rectangle d'une cellule : [sud, ouest, nord, est]. */
export function geohashBounds(hash: string): [number, number, number, number] {
  let latMin = -90
  let latMax = 90
  let lngMin = -180
  let lngMax = 180
  let even = true
  for (const char of hash) {
    const value = BASE32.indexOf(char)
    for (let i = 4; i >= 0; i--) {
      const bit = (value >> i) & 1
      if (even) {
        const mid = (lngMin + lngMax) / 2
        if (bit) lngMin = mid
        else lngMax = mid
      } else {
        const mid = (latMin + latMax) / 2
        if (bit) latMin = mid
        else latMax = mid
      }
      even = !even
    }
  }
  return [latMin, lngMin, latMax, lngMax]
}

/** Les cellules traversées par un tracé : on avance tous les 8 m le long de chaque segment. */
export function cellsAlong(points: RoutePoint[], stepM = 8): Set<string> {
  const cells = new Set<string>()
  points.forEach(([lat, lng], i) => {
    cells.add(encodeGeohash(lat, lng))
    const next = points[i + 1]
    if (!next) return
    const steps = Math.ceil(distanceMeters({ lat, lng }, { lat: next[0], lng: next[1] }) / stepM)
    for (let s = 1; s < steps; s++) cells.add(encodeGeohash(lat + ((next[0] - lat) * s) / steps, lng + ((next[1] - lng) * s) / steps))
  })
  return cells
}

/** Les cellules encore inconnues, rangées par carré (préfixe de 5 caractères). */
export function newCells(found: Set<string>, known: Set<string>): Map<string, string[]> {
  const blocks = new Map<string, string[]>()
  for (const cell of found) {
    if (known.has(cell)) continue
    const block = cell.slice(0, BLOCK_PRECISION)
    blocks.set(block, [...(blocks.get(block) ?? []), cell.slice(BLOCK_PRECISION)])
  }
  return blocks
}

export const countCells = (blocks: Map<string, string[]>) => [...blocks.values()].reduce((n, cells) => n + cells.length, 0)

/** Toutes les cellules connues, à partir des documents users/{uid}/exploration/{carré} = { cells: [suffixes] }. */
export const knownCells = (docs: { id: string; cells?: string[] }[]) => new Set(docs.flatMap((d) => (d.cells ?? []).map((c) => d.id + c)))

export const zoneBones = (count: number) => Math.min(MAX_ZONE_BONES, count * BONES_PER_ZONE)

/** « 1 zone découverte », « 230 zones découvertes » */
export const zonesLabel = (n: number) => `${n.toLocaleString('fr-FR')} zone${n > 1 ? 's' : ''} découverte${n > 1 ? 's' : ''}`

/**
 * Le brouillard en GeoJSON : un grand polygone (tout le globe utile) troué par les cellules découvertes.
 * Les cellules voisines d'une même rangée sont fusionnées : moins de trous, pas de couture visible.
 */
export function fogShape(cells: Set<string>): { polygon: { type: 'Polygon'; coordinates: [number, number][][] }; centers: [number, number][] } {
  const boxes = [...cells].map(geohashBounds).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: [number, number, number, number][] = []
  for (const box of boxes) {
    const last = merged[merged.length - 1]
    // Même rangée (même sud) et collée à droite : on allonge le trou.
    if (last && Math.abs(last[0] - box[0]) < 1e-9 && Math.abs(last[3] - box[1]) < 1e-9) last[3] = box[3]
    else merged.push([...box])
  }
  const world: [number, number][] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ]
  const holes = merged.map(([s, w, n, e]): [number, number][] => [
    [w, s],
    [w, n],
    [e, n],
    [e, s],
    [w, s],
  ])
  const centers = boxes.map(([s, w, n, e]): [number, number] => [(s + n) / 2, (w + e) / 2])
  return { polygon: { type: 'Polygon', coordinates: [world, ...holes] }, centers }
}
