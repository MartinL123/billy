import { describe, expect, it } from 'vitest'
import { douglasPeucker, formatDuration, placePhoto, simplifyWalk, timesAlong, type TimedPoint } from './balade'
import type { RoutePoint } from './route'

describe('balade importée', () => {
  it('Douglas-Peucker garde les virages et retire les points alignés', () => {
    // Une ligne droite vers le nord avec un petit bruit de 1 m, puis un virage franc à l'est.
    const line: RoutePoint[] = Array.from({ length: 50 }, (_, i) => [48.85 + i * 0.0001, 2.35 + (i % 2) * 0.00001])
    const turn: RoutePoint[] = Array.from({ length: 20 }, (_, i) => [48.85 + 49 * 0.0001, 2.35 + (i + 1) * 0.0002])
    const out = douglasPeucker([...line, ...turn])
    expect(out.length).toBeLessThan(6)
    expect(out[0]).toEqual(line[0])
    expect(out[out.length - 1]).toEqual(turn[turn.length - 1])
    expect(out).toContainEqual(line[49])
  })

  it('tient toujours dans 500 points', () => {
    // Le pire cas pour Douglas-Peucker (chaque point est un virage), à la taille d'une longue balade.
    const zigzag: RoutePoint[] = Array.from({ length: 2000 }, (_, i) => [48.85 + i * 0.00005, 2.35 + (i % 2) * 0.0003])
    expect(simplifyWalk(zigzag).length).toBeLessThanOrEqual(500)
    // Calcul lourd : plus de 5 s quand toute la suite tourne en parallèle sur une machine chargée.
  }, 20000)

  it('écrit la durée', () => {
    expect(formatDuration(47)).toBe('47 min')
    expect(formatDuration(72)).toBe('1 h 12')
    expect(formatDuration(120)).toBe('2 h')
  })
})

describe('photos de la balade', () => {
  const timed: TimedPoint[] = [
    { lat: 48.85, lng: 2.35, time: '2026-10-12T10:00:00Z' },
    { lat: 48.86, lng: 2.35, time: '2026-10-12T10:20:00Z' },
  ]
  const points = timed.map((p): RoutePoint => [p.lat, p.lng])

  it('sa position GPS si elle est près du tracé', () => {
    expect(placePhoto({ lat: 48.855, lng: 2.3502 }, points, timed)).toEqual({ lat: 48.855, lng: 2.3502 })
  })

  it('sinon, d’après son heure, là où l’on était', () => {
    const at = placePhoto({ lat: 48.9, lng: 2.4, time: Date.parse('2026-10-12T10:05:00Z') }, points, timed)!
    expect(at.lat).toBeCloseTo(48.8525, 6)
    expect(placePhoto({ time: Date.parse('2026-10-12T10:23:00Z') }, points, timed)).toEqual({ lat: 48.86, lng: 2.35 })
  })

  it('rien pour une photo prise un autre jour ou loin sans heure', () => {
    expect(placePhoto({ time: Date.parse('2026-10-12T12:00:00Z') }, points, timed)).toBeUndefined()
    expect(placePhoto({ lat: 48.9, lng: 2.4 }, points, timed)).toBeUndefined()
    expect(placePhoto({}, points)).toBeUndefined()
  })
})

describe('heures le long d’un trajet enregistré', () => {
  it('réparties selon la distance', () => {
    const points: RoutePoint[] = [
      [48.85, 2.35],
      [48.86, 2.35],
      [48.87, 2.35],
    ]
    const timed = timesAlong(points, '2026-10-12T10:00:00Z', 20)
    expect(timed[1]!.time).toBe('2026-10-12T10:10:00.000Z')
    expect(timed[2]!.time).toBe('2026-10-12T10:20:00.000Z')
    expect(timesAlong(points, undefined, 20)).toEqual([])
  })
})

