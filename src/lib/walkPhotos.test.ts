import { describe, expect, it } from 'vitest'
import { photosAddedLine, photosInWindow, placeOnWalk, routeTimedPoints, walkWindow } from './walkPhotos'
import type { RoutePoint } from './route'

const start = '2026-10-22T07:00:00.000Z'
const at = (min: number) => new Date(Date.parse(start) + min * 60_000).toISOString()
// 1 km plein nord en 10 min, un point par minute.
const points: RoutePoint[] = Array.from({ length: 11 }, (_, i) => [48.8 + i * 0.0009, 2.3])
const track = { t: points.map((_, i) => i * 60), lat: points.map((p) => p[0]), lng: points.map((p) => p[1]) }

describe('photos de la balade (T-103)', () => {
  it('la fenêtre de la balade, recadrée ou non', () => {
    expect(walkWindow({ startTime: start, endTime: at(10) })).toEqual({ start, end: at(10) })
    expect(walkWindow({ startTime: start, durationMin: 25 })).toEqual({ start, end: at(25) })
    expect(walkWindow({ startTime: start, endTime: at(10), trimmed: { startS: 120, endS: 480 } })).toEqual({ start: at(2), end: at(8) })
    expect(walkWindow({ endTime: at(10) })).toBeUndefined()
  })

  it('garde les photos prises pendant la balade, dans l’ordre, sans doublon', () => {
    const photos = [{ time: at(7) }, { time: at(-1) }, { time: at(3) }, {}, { time: at(11) }, { time: at(3) }]
    expect(photosInWindow(photos, { start, end: at(10) })).toEqual([{ time: at(3) }, { time: at(7) }])
    // Déjà dans le souvenir (même seconde) : pas deux fois.
    expect(photosInWindow(photos, { start, end: at(10) }, [{ time: at(7) }])).toEqual([{ time: at(3) }])
  })

  it('pose une photo sans position grâce à son heure, sur le trajet daté', () => {
    const timed = routeTimedPoints({ points, track, startTime: start })
    expect(timed[5]!.time).toBe(at(5))
    const spot = placeOnWalk({ time: at(5) }, { points, track, startTime: start })!
    expect(spot.lat).toBeCloseTo(48.8 + 5 * 0.0009, 6)
    // À mi-chemin entre deux points.
    expect(placeOnWalk({ time: new Date(Date.parse(at(2)) + 30_000).toISOString() }, { points, track, startTime: start })!.lat).toBeCloseTo(48.8 + 2.5 * 0.0009, 6)
  })

  it('sa position si elle est près du tracé ; sinon son heure ; sinon rien', () => {
    expect(placeOnWalk({ lat: 48.8045, lng: 2.3001, time: at(9) }, { points, track, startTime: start })).toEqual({ lat: 48.8045, lng: 2.3001 })
    // Position loin du tracé (photo envoyée par un proche…) : l’heure décide.
    expect(placeOnWalk({ lat: 45, lng: 5, time: at(0) }, { points, track, startTime: start })).toEqual({ lat: 48.8, lng: 2.3 })
    expect(placeOnWalk({}, { points, track, startTime: start })).toBeUndefined()
    // Sans trajet daté : les heures réparties le long du tracé.
    expect(placeOnWalk({ time: at(10) }, { points, startTime: start, durationMin: 10 })!.lat).toBeCloseTo(points[10]![0], 6)
  })

  it('le récap le dit', () => {
    expect(photosAddedLine(3)).toBe('3 photos de la balade ajoutées')
    expect(photosAddedLine(1)).toBe('1 photo de la balade ajoutée')
  })
})
