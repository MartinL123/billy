import { describe, expect, it } from 'vitest'
import { storeRoute, type Route } from './route'
import { momentOnStop, STOP_TILES, stopsToTell, tellBone } from './walkTell'

const route: Route = {
  points: [[48.85, 2.35]],
  distanceM: 1000,
  moments: [],
  stops: [
    { at: 120, durS: 60, lat: 48.851, lng: 2.35, street: 'Square Ampère' },
    { at: 600, durS: 40, lat: 48.86, lng: 2.35 },
  ],
}

describe('raconter la balade (V6 § 6.2)', () => {
  it('six tuiles, dont Reniflage et Autre', () => {
    expect(STOP_TILES.map((t) => t.label)).toEqual(['Pipi', 'Rencontre', 'Reniflage', 'Jeu', 'Moment de stress', 'Autre'])
  })

  it('le repère se pose à la place de l’arrêt, avec sa rue, et s’y rattache', () => {
    const moments = momentOnStop(route, 0, 'reniflage')!
    expect(moments).toEqual([{ lat: 48.851, lng: 2.35, type: 'reniflage', street: 'Square Ampère' }])
    const stored = storeRoute({ ...route, moments })
    expect(stored.stops![0]!.momentIndex).toBe(0)
    expect(stored.stops![1]!.momentIndex).toBeUndefined()
    expect(momentOnStop(route, 5, 'jeu')).toBeUndefined()
  })

  it('seulement les arrêts sans repère sont à raconter', () => {
    expect(stopsToTell(route)).toEqual([0, 1])
    expect(stopsToTell({ stops: [{ ...route.stops![0]!, momentIndex: 0 }, route.stops![1]!] })).toEqual([1])
  })

  it('+3 os une fois par balade, dans la limite des notes du jour, s’il y a eu au moins un repère', () => {
    expect(tellBone('w1', '2026-10-22', [], { placed: 1 })).toMatchObject({ id: 'note-raconte-w1', amount: 3, reason: 'note' })
    expect(tellBone('w1', '2026-10-22', [], { placed: 0 })).toBeUndefined()
    expect(tellBone('w1', '2026-10-22', [], { placed: 2, toldAt: '2026-10-22' })).toBeUndefined()
    expect(tellBone('w1', '2026-10-22', [{ id: 'note-raconte-w1', date: '2026-10-21', amount: 3, reason: 'note', refId: 'raconte-w1' }], { placed: 1 })).toBeUndefined()
    const full = [1, 2, 3].map((i) => ({ id: `note-${i}`, date: '2026-10-22', amount: 3, reason: 'note' as const, refId: String(i) }))
    expect(tellBone('w1', '2026-10-22', full, { placed: 1 })).toBeUndefined()
  })
})
