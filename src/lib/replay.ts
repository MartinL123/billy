import { distanceMeters } from './community'
import type { RoutePoint } from './route'

// « Revoir la balade » : la caméra suit le tracé en une dizaine de secondes, en tournant doucement.

export const REPLAY_MS = 10000

/** Distances cumulées depuis le départ, point par point (en mètres). */
export function cumulative(points: RoutePoint[]): number[] {
  const out = [0]
  for (let i = 1; i < points.length; i++) out.push(out[i - 1]! + distanceMeters({ lat: points[i - 1]![0], lng: points[i - 1]![1] }, { lat: points[i]![0], lng: points[i]![1] }))
  return out
}

/** Le point situé à `d` mètres du départ, le long du tracé. */
export function pointAlong(points: RoutePoint[], cum: number[], d: number): RoutePoint {
  const total = cum[cum.length - 1] ?? 0
  if (points.length === 0) return [0, 0]
  if (d <= 0 || total === 0) return points[0]!
  if (d >= total) return points[points.length - 1]!
  const i = cum.findIndex((c) => c >= d)
  const a = points[i - 1]!
  const b = points[i]!
  const f = (d - cum[i - 1]!) / (cum[i]! - cum[i - 1]! || 1)
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

/** Cap de a vers b, en degrés (0 = nord, 90 = est). */
export function bearing(a: RoutePoint, b: RoutePoint): number {
  const rad = Math.PI / 180
  const y = Math.sin((b[1] - a[1]) * rad) * Math.cos(b[0] * rad)
  const x = Math.cos(a[0] * rad) * Math.sin(b[0] * rad) - Math.sin(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((b[1] - a[1]) * rad)
  return (Math.atan2(y, x) / rad + 360) % 360
}

/** Tourne de `current` vers `target` d'une fraction, par le plus court chemin (pas de tour complet à 359° → 1°). */
export function turnToward(current: number, target: number, fraction: number): number {
  const diff = ((target - current + 540) % 360) - 180
  return (current + diff * fraction + 360) % 360
}

/** Douceur au départ et à l'arrivée. */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
