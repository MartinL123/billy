import { describe, expect, it } from 'vitest'
import { douglasPeucker, formatDuration, importWalk, simplifyWalk, type TimedPoint } from './balade'
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
    const zigzag: RoutePoint[] = Array.from({ length: 5000 }, (_, i) => [48.85 + i * 0.00005, 2.35 + (i % 2) * 0.0003])
    expect(simplifyWalk(zigzag).length).toBeLessThanOrEqual(500)
  })

  it('lit le jour, la durée et la distance', () => {
    const raw: TimedPoint[] = [
      { lat: 48.8566, lng: 2.3522, time: '2026-10-12T10:00:00Z' },
      { lat: 48.8584, lng: 2.3522, time: '2026-10-12T10:20:00Z' },
      { lat: 48.8584, lng: 2.3549, time: '2026-10-12T10:47:30Z' },
    ]
    const walk = importWalk(raw)
    expect(walk.date).toBe('2026-10-12')
    expect(walk.durationMin).toBe(48)
    expect(walk.distanceM).toBeGreaterThan(390)
    expect(walk.distanceM).toBeLessThan(410)
    expect(walk.points).toHaveLength(3)
    expect(importWalk([{ lat: 1, lng: 1 }, { lat: 1.001, lng: 1 }]).date).toBeUndefined()
  })

  it('écrit la durée', () => {
    expect(formatDuration(47)).toBe('47 min')
    expect(formatDuration(72)).toBe('1 h 12')
    expect(formatDuration(120)).toBe('2 h')
  })
})
