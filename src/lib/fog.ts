import { distanceMeters } from './community'

// Le brouillard de la carte qui se découvre (docs/specs/carte-a-decouvrir.md § 3).
// Grille fixe d’environ 25 m ; une balade découvre toutes les cases dont le centre est à 25 m ou moins du trajet,
// calculé sur les points complets du fichier. Jamais de chiffre à battre.
// (Jusqu’en octobre 2026 : cases de 50 m dans `fog/` ; elles ont été recalculées une fois dans `fog25/`.)

export const CELL_LAT = 0.000225
export const CELL_LNG = 0.00035
export const REVEAL_M = 25
/** La collection des cases de 25 m (users/{uid}/fog25/{zone}). */
export const FOG_COLLECTION = 'fog25'
/** Une zone de stockage : un carré de 0,05° (≈ 5 km), un document Firestore `fog/{zone}`. */
export const ZONE_DEG = 0.05

type LatLng = { lat: number; lng: number }

export const cellOf = (p: LatLng) => `${Math.floor(p.lat / CELL_LAT)}_${Math.floor(p.lng / CELL_LNG)}`

export function cellCenter(cell: string): LatLng {
  const [i, j] = cell.split('_').map(Number) as [number, number]
  return { lat: (i + 0.5) * CELL_LAT, lng: (j + 0.5) * CELL_LNG }
}

/** Le rectangle d’une case : [sud, ouest, nord, est]. */
export function cellBounds(cell: string): [number, number, number, number] {
  const [i, j] = cell.split('_').map(Number) as [number, number]
  return [i * CELL_LAT, j * CELL_LNG, (i + 1) * CELL_LAT, (j + 1) * CELL_LNG]
}

export const zoneOf = (cell: string) => {
  const c = cellCenter(cell)
  return `${Math.floor(c.lat / ZONE_DEG)}_${Math.floor(c.lng / ZONE_DEG)}`
}

/** Distance d’un point à un segment [a, b], en mètres (projection locale, assez juste à l’échelle d’une balade). */
function toSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const k = Math.cos((p.lat * Math.PI) / 180)
  const [ax, ay, bx, by, px, py] = [a.lng * k, a.lat, b.lng * k, b.lat, p.lng * k, p.lat]
  const dx = bx - ax
  const dy = by - ay
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0
  return distanceMeters(p, { lat: ay + t * dy, lng: (ax + t * dx) / k })
}

/** Les cases découvertes par un trajet : centre à 25 m ou moins d’un de ses segments. */
export function revealedCells(points: LatLng[], radius = REVEAL_M): Set<string> {
  const cells = new Set<string>()
  if (points.length === 0) return cells
  const segments = points.length === 1 ? [[points[0]!, points[0]!]] : points.slice(1).map((p, i) => [points[i]!, p])
  for (const [a, b] of segments as [LatLng, LatLng][]) {
    const pad = radius / 111320
    const padLng = radius / (111320 * Math.cos((a.lat * Math.PI) / 180))
    const i0 = Math.floor((Math.min(a.lat, b.lat) - pad) / CELL_LAT)
    const i1 = Math.floor((Math.max(a.lat, b.lat) + pad) / CELL_LAT)
    const j0 = Math.floor((Math.min(a.lng, b.lng) - padLng) / CELL_LNG)
    const j1 = Math.floor((Math.max(a.lng, b.lng) + padLng) / CELL_LNG)
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const id = `${i}_${j}`
        if (!cells.has(id) && toSegment(cellCenter(id), a, b) <= radius) cells.add(id)
      }
  }
  return cells
}

/** Les cases encore dans le brouillard, rangées par zone de stockage. Une case connue n’est jamais recomptée. */
export function freshCells(found: Iterable<string>, known: Set<string>): Map<string, string[]> {
  const zones = new Map<string, string[]>()
  for (const cell of found) {
    if (known.has(cell)) continue
    const zone = zoneOf(cell)
    zones.set(zone, [...(zones.get(zone) ?? []), cell])
  }
  return zones
}

export const countFresh = (zones: Map<string, string[]>) => [...zones.values()].reduce((n, c) => n + c.length, 0)

/** Toutes les cases découvertes, depuis les documents `fog/{zone}` = { cells }. */
export const knownFog = (docs: { cells?: string[] }[]) => new Set(docs.flatMap((d) => d.cells ?? []))

// ——— Pourcentage d’une commune ———

/** Point dans un polygone (contour extérieur), par la règle du nombre de croisements. */
export function inPolygon(p: LatLng, ring: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!
    const b = ring[j]!
    if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) inside = !inside
  }
  return inside
}

/** Surface d’un polygone en m² (formule sphérique, assez juste pour une commune). */
export function polygonArea(ring: LatLng[]): number {
  const R = 6378137
  const rad = Math.PI / 180
  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!
    const b = ring[(i + 1) % ring.length]!
    sum += (b.lng - a.lng) * rad * (2 + Math.sin(a.lat * rad) + Math.sin(b.lat * rad))
  }
  return Math.abs((sum * R * R) / 2)
}

/** Surface d’une case, en m² (elle dépend de la latitude). */
export const cellArea = (cell: string) => {
  const c = cellCenter(cell)
  return CELL_LAT * 110574 * CELL_LNG * 111320 * Math.cos((c.lat * Math.PI) / 180)
}

/** Part découverte d’une commune : cases dont le centre est dans la commune × leur surface ÷ surface de la commune. */
export function discoveredShare(cells: Iterable<string>, commune: { ring: LatLng[]; areaM2: number; bbox: [number, number, number, number] }): number {
  const [s, w, n, e] = commune.bbox
  let area = 0
  for (const cell of cells) {
    const c = cellCenter(cell)
    if (c.lat < s || c.lat > n || c.lng < w || c.lng > e) continue
    if (inPolygon(c, commune.ring)) area += cellArea(cell)
  }
  return commune.areaM2 > 0 ? area / commune.areaM2 : 0
}


/** « 56 cases » */
export const cellsLabel = (n: number) => `${n.toLocaleString('fr-FR')} case${n > 1 ? 's' : ''}`
