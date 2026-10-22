// « Lieux les plus fréquentés » (T-109) : un calque de chaleur des passages, toutes balades confondues.
// Les points sont repris tous les ~25 m le long de chaque tracé : la chaleur compte les passages, pas la cadence du GPS
// (une montre qui note un point par seconde ne doit pas peser plus qu’un import Strava).

import { distanceMeters } from './community'
import type { RoutePoint } from './route'

/** L’écart entre deux points de chaleur le long d’un tracé. */
export const HEAT_STEP_M = 25
/** Au-delà, on garde un point sur deux, puis un sur trois… : la carte reste fluide sur un vieil iPhone. */
export const HEAT_MAX_POINTS = 20_000

/** Les points de chaleur d’un tracé : le départ, puis un point tous les `step` mètres. */
export function resample(points: RoutePoint[], step = HEAT_STEP_M): RoutePoint[] {
  if (points.length === 0) return []
  const out: RoutePoint[] = [points[0]!]
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    const [aLat, aLng] = points[i - 1]!
    const [bLat, bLng] = points[i]!
    const d = distanceMeters({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng })
    if (!(d > 0)) continue
    let at = step - carry
    while (at <= d) {
      const f = at / d
      out.push([aLat + f * (bLat - aLat), aLng + f * (bLng - aLng)])
      at += step
    }
    carry = (carry + d) % step
  }
  return out
}

/** Tous les points de chaleur des balades, plafonnés à `max` en gardant la répartition. */
export function heatPoints(routes: RoutePoint[][], max = HEAT_MAX_POINTS, step = HEAT_STEP_M): RoutePoint[] {
  const all = routes.flatMap((points) => resample(points, step))
  const every = Math.max(1, Math.ceil(all.length / max))
  const out: RoutePoint[] = []
  for (let i = 0; i < all.length; i += every) out.push(all[i]!)
  return out
}
