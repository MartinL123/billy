import { describe, expect, it } from 'vitest'
import { revealedCells } from './fog'
import { durationGroup, fogAround, loopLevel, pickLoops, walkMinutes } from './loops'
import type { RoutePoint } from './route'
import type { WalkItem } from './walkList'

const HERE = { lat: 48.8566, lng: 2.3522 }
/** Un aller-retour vers l’est depuis `from` (0,001° de longitude ≈ 73 m à Paris). */
const line = (from: { lat: number; lng: number }, steps: number): RoutePoint[] => Array.from({ length: steps + 1 }, (_, i) => [from.lat, from.lng + i * 0.001])
const walk = (id: string, date: string, points: RoutePoint[], durationMin: number, distanceM = 2000): WalkItem => ({ id, date, name: id, route: { points, distanceM, durationMin, moments: [] } })

describe('boucles pour Billy (V6 § 8.2)', () => {
  it('range les durées en ≈ 15, 30 et 45 min', () => {
    expect([10, 22, 23, 37, 38, 90].map(durationGroup)).toEqual([15, 15, 30, 30, 45, 45])
  })

  it('prend la durée notée, sinon les heures, sinon la distance', () => {
    expect(walkMinutes({ points: [], distanceM: 0, durationMin: 32, moments: [] })).toBe(32)
    expect(walkMinutes({ points: [], distanceM: 0, moments: [], startTime: '2026-10-22T06:00:00Z', endTime: '2026-10-22T06:20:00Z' })).toBe(20)
    expect(walkMinutes({ points: [], distanceM: 1500, moments: [] })).toBe(20)
  })

  it('donne le niveau : facile sous 1 km ou pour un chiot de moins de 6 mois', () => {
    expect(loopLevel(800, '2025-01-01', '2026-10-22')).toBe('Facile · chiot')
    expect(loopLevel(2500, '2026-06-01', '2026-10-22')).toBe('Facile · chiot')
    expect(loopLevel(2500, '2026-04-01', '2026-10-22')).toBe('Moyen')
    expect(loopLevel(3000, undefined, '2026-10-22')).toBe('Moyen')
    expect(loopLevel(4200, '2025-01-01', '2026-10-22')).toBe('Long')
  })

  it('compte le brouillard à moins de 100 m du tracé, jamais les cases déjà vues', () => {
    const points = line(HERE, 5)
    const all = fogAround(points, new Set())
    expect(all).toBeGreaterThan(0)
    const known = revealedCells(points.map(([lat, lng]) => ({ lat, lng })))
    expect(fogAround(points, known)).toBeLessThan(all)
  })

  it('propose une boucle par durée, partie à moins de 300 m, la plus riche en brouillard', () => {
    const near = { lat: HERE.lat + 0.001, lng: HERE.lng } // ≈ 110 m
    const far = { lat: HERE.lat + 0.004, lng: HERE.lng } // ≈ 445 m
    const known = revealedCells(line(HERE, 8).map(([lat, lng]) => ({ lat, lng })), 100)
    const walks = [
      walk('connue-15', '2026-10-20', line(HERE, 8), 14),
      walk('neuve-15', '2026-10-01', line({ lat: HERE.lat - 0.002, lng: HERE.lng }, 8).map(([lat, lng], i): RoutePoint => (i === 0 ? [HERE.lat, HERE.lng] : [lat, lng])), 16),
      walk('trente', '2026-10-10', line(near, 10), 31),
      walk('loin-45', '2026-10-12', line(far, 10), 45),
    ]
    const loops = pickLoops(walks, HERE, known, { birthDate: '2025-01-01', today: '2026-10-22' })
    expect(loops.map((l) => [l.item.id, l.duration])).toEqual([
      ['neuve-15', 15],
      ['trente', 30],
    ])
    expect(loops[0]!.level).toBe('Moyen')
  })

  it('à brouillard égal, la plus récente ; jamais plus de 3', () => {
    const walks = [walk('a', '2026-10-01', line(HERE, 3), 15), walk('b', '2026-10-05', line(HERE, 3), 15), walk('c', '2026-10-05', line(HERE, 3), 30), walk('d', '2026-10-05', line(HERE, 3), 50)]
    const loops = pickLoops(walks, HERE, new Set(), { today: '2026-10-22' })
    expect(loops.map((l) => l.item.id)).toEqual(['b', 'c', 'd'])
    expect(pickLoops(walks, { lat: 48.9, lng: 2.4 }, new Set(), { today: '2026-10-22' })).toEqual([])
  })
})
