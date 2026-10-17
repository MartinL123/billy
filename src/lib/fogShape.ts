import { cellBounds, cellCenter } from './fog'

/**
 * Le brouillard en GeoJSON : un grand polygone troué par les cases découvertes. Les cases voisines d'une même
 * rangée sont fusionnées en un seul trou (moins de trous, pas de couture visible).
 */
export function fogShape(cells: Set<string>): { polygon: { type: 'Polygon'; coordinates: [number, number][][] }; centers: [number, number][] } {
  const boxes = [...cells].map(cellBounds).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: [number, number, number, number][] = []
  for (const box of boxes) {
    const last = merged[merged.length - 1]
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
  const centers = [...cells].map((c): [number, number] => {
    const p = cellCenter(c)
    return [p.lat, p.lng]
  })
  return { polygon: { type: 'Polygon', coordinates: [world, ...holes] }, centers }
}
