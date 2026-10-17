import { describe, expect, it } from 'vitest'
import { distanceToRoute, formatRouteDistance, routeDistance, routeFromSaved, routesToDrop, simplify, momentReaction, hasReaction, withMarkMoments, walksOfMonth, isHardMoment, type Route, type RouteMoment, type RoutePoint } from './route'

const A: RoutePoint = [48.8566, 2.3522]
const B: RoutePoint = [48.8584, 2.3522] // ~200 m au nord
const C: RoutePoint = [48.8584, 2.3549] // ~200 m à l'est de B

/** Un trajet de test (comme ceux enregistrés). */
const buildRoute = (points: RoutePoint[], moments: RouteMoment[]): Route => ({ points, distanceM: Math.round(routeDistance(points)), moments })

describe('les trajets', () => {
  it('mesure la distance comme la somme des segments', () => {
    expect(routeDistance([])).toBe(0)
    expect(routeDistance([A])).toBe(0)
    const ab = routeDistance([A, B])
    expect(ab).toBeGreaterThan(190)
    expect(ab).toBeLessThan(210)
    expect(routeDistance([A, B, C])).toBeGreaterThan(ab + 180)
    expect(formatRouteDistance(648)).toBe('650 m')
    expect(formatRouteDistance(1804)).toBe('1,8 km')
  })

  it('simplifie : 5 décimales, sans doublons qui se suivent', () => {
    expect(simplify([[48.856612345, 2.352298765], [48.856612349, 2.352298761], [48.8584, 2.3522]])).toEqual([[48.85661, 2.3523], [48.8584, 2.3522]])
  })

  it('sait si un toucher est près du trajet', () => {
    expect(distanceToRoute({ lat: 48.8575, lng: 2.3522 }, [A, B])).toBeLessThan(2)
    expect(distanceToRoute({ lat: 48.8575, lng: 2.3600 }, [A, B])).toBeGreaterThan(500)
  })

  it('reprend un trajet habituel tel quel', () => {
    const saved = { name: 'Tour du parc', points: [A, B], distanceM: 200, lastUsedAt: '2026-10-14' }
    expect(routeFromSaved('r1', saved)).toEqual({ points: [A, B], distanceM: 200, savedRouteId: 'r1', moments: [] })
  })

  it('garde au plus 20 trajets habituels, les plus récemment utilisés', () => {
    const routes = Array.from({ length: 22 }, (_, i) => ({ id: `r${i}`, lastUsedAt: `2026-10-${String(i + 1).padStart(2, '0')}` }))
    expect(routesToDrop(routes).sort()).toEqual(['r0', 'r1'])
    expect(routesToDrop(routes.slice(0, 5))).toEqual([])
  })
})

import { readRoute, storeRoute } from './route'

describe('enregistrement d’un trajet', () => {
  it('passe par { lat, lng } (Firestore refuse les tableaux de tableaux) sans rien perdre', () => {
    const route = { ...buildRoute([A, B, C], [{ lat: 48.858, lng: 2.3522, type: 'rappel', note: 'Revenu tout de suite' }]), durationMin: 45, savedRouteId: 'r1' }
    const stored = storeRoute(route)
    expect(stored.points[0]).toEqual({ lat: A[0], lng: A[1] })
    expect(stored.points.every((p) => !Array.isArray(p))).toBe(true)
    expect(readRoute(stored)).toEqual(route)
    expect(readRoute(undefined)).toBeUndefined()
  })

  it('peur et grogne deviennent une réaction, seulement sur demande', () => {
    expect(momentReaction({ lat: 0, lng: 0, type: 'peur', note: 'Un vélo est passé très près.' })).toEqual({ situation: 'un vélo est passé très près', reaction: 'peur' })
    expect(momentReaction({ lat: 0, lng: 0, type: 'grogne', street: 'Rue de Lobau' })).toEqual({ situation: 'il passe rue de Lobau', reaction: 'peur' })
    expect(momentReaction({ lat: 0, lng: 0, type: 'grogne' })?.situation).toBe('il est en balade')
    expect(momentReaction({ lat: 0, lng: 0, type: 'rappel' })).toBeUndefined()
    expect(hasReaction([{ situation: 'il passe rue de Lobau', reaction: 'peur' }], { situation: 'il passe rue de Lobau', reaction: 'peur' })).toBe(true)
  })

  it('« A marqué » ajouté pour un spot marqué près du trajet, une seule fois', () => {
    const route = buildRoute([A, B], [])
    const near = { lat: 48.8575, lng: 2.3524, name: 'Square du Temple' } // ~15 m de la ligne
    const far = { lat: 48.8575, lng: 2.36, name: 'Loin' }
    const once = withMarkMoments(route, [near, far])
    expect(once.moments).toEqual([{ lat: near.lat, lng: near.lng, type: 'marque', note: 'Square du Temple' }])
    expect(withMarkMoments(once, [near])).toBe(once)
  })

  it('« Ses balades » : les trajets du mois seulement', () => {
    const route = storeRoute(buildRoute([A, B], [{ lat: A[0], lng: A[1], type: 'peur' }]))
    const entries = [
      { date: '2026-10-14', route },
      { date: '2026-10-02', route },
      { date: '2026-09-30', route },
      { date: '2026-10-05' },
    ]
    expect(walksOfMonth(entries, '2026-10')).toHaveLength(2)
    expect(isHardMoment({ lat: 0, lng: 0, type: 'grogne' })).toBe(true)
    expect(isHardMoment({ lat: 0, lng: 0, type: 'marque' })).toBe(false)
  })
})
