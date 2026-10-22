import { describe, expect, it } from 'vitest'
import { toImported } from './activity'
import { gpsActivity, type GpsPoint } from './gpsWalk'
import { readRoute, storeRoute, type StoredRoute } from './route'
import { buildTrack, docBytes, firestoreBytes, fitTrack, MAX_ENTRY_BYTES, readTrack, trackForEntry } from './track'
import { watchActivity, type WatchWalk } from './watch'

const START = Date.parse('2026-10-22T07:00:00Z')
const iso = (s: number) => new Date(START + s * 1000).toISOString()

/** Une marche à 1,3 m/s vers le nord, un point par seconde (comme le GPS de l’iPhone), avec altitude et vitesse. */
function walkPoints(seconds: number, every = 1): GpsPoint[] {
  const out: GpsPoint[] = []
  for (let s = 0; s <= seconds; s += every) out.push({ lat: 48.85 + (s * 1.3) / 111_000, lng: 2.35, time: iso(s), alt: 35 + s / 100, speed: 1.3, accuracy: 5 })
  return out
}

describe('le trajet daté (V6 § 2.1)', () => {
  it('un point toutes les 5 s, le dernier gardé, colonnes de même longueur', () => {
    const track = buildTrack(walkPoints(62))!
    expect(track.t).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 62])
    expect(track.lat).toHaveLength(13)
    expect(track.lng).toHaveLength(13)
    expect(track.alt).toHaveLength(13)
    expect(track.v).toHaveLength(13)
  })

  it('arrondit : 5 décimales, altitude à 1 décimale, vitesse à 2', () => {
    const track = buildTrack([
      { lat: 48.123456789, lng: 2.987654321, time: iso(0), alt: 35.27, speed: 1.23456 },
      { lat: 48.12355, lng: 2.98765, time: iso(5), alt: 35.31, speed: 1.2 },
    ])!
    expect(track.lat[0]).toBe(48.12346)
    expect(track.lng[0]).toBe(2.98765)
    expect(track.alt).toEqual([35.3, 35.3])
    expect(track.v![0]).toBe(1.23)
  })

  it('calcule la vitesse quand la source ne la donne pas, et se passe d’altitude', () => {
    const track = buildTrack([
      { lat: 48.85, lng: 2.35, time: iso(0) },
      { lat: 48.85009, lng: 2.35, time: iso(10) },
    ])!
    expect(track.alt).toBeUndefined()
    // 10 m en 10 s
    expect(track.v![1]).toBeCloseTo(1, 1)
  })

  it('les secondes partent de l’heure de départ et les points sans heure sont écartés', () => {
    const track = buildTrack(
      [
        { lat: 48.85, lng: 2.35 },
        { lat: 48.85, lng: 2.35, time: iso(10) },
        { lat: 48.851, lng: 2.35, time: iso(30) },
      ],
      iso(0),
    )!
    expect(track.t).toEqual([10, 30])
    expect(buildTrack([{ lat: 48.85, lng: 2.35, time: iso(0) }])).toBeUndefined()
  })

  it('au-delà de 2 h, un point toutes les 10 s', () => {
    const track = buildTrack(walkPoints(2.5 * 3600))!
    expect(track.t[1]).toBe(10)
    expect(track.t.length).toBe(901)
  })

  it('30 min ≈ 360 points ≈ 15 Ko', () => {
    const track = buildTrack(walkPoints(30 * 60))!
    expect(track.t.length).toBe(361)
    expect(firestoreBytes(track)).toBeLessThan(16_000)
  })

  it('3 h de balade : tout le document reste sous 900 Ko', () => {
    const imported = toImported(gpsActivity(walkPoints(3 * 3600), iso(0)))!
    const entry = { date: '2026-10-22', text: 'Balade du matin', tags: [], photos: [], route: storeRoute({ points: imported.points, distanceM: imported.distanceM, moments: [] }) }
    const track = trackForEntry(imported.track, entry)!
    expect(track.t.length).toBe(1081)
    expect(docBytes({ ...entry, route: { ...entry.route, track } })).toBeLessThan(MAX_ENTRY_BYTES)
  })

  it('allège un trajet trop gros pour tenir dans le budget', () => {
    const track = buildTrack(walkPoints(30 * 60))!
    const fitted = fitTrack(track, 6000)!
    expect(firestoreBytes(fitted)).toBeLessThanOrEqual(6000)
    expect(fitted.t[fitted.t.length - 1]).toBe(1800)
    expect(fitted.lat.length).toBe(fitted.t.length)
    expect(fitTrack(track, 100_000)).toBe(track)
  })
})

describe('les trois sources', () => {
  it('GPS de Flair : altitude et vitesse de l’iPhone gardées, précision laissée', () => {
    const imported = toImported(gpsActivity(walkPoints(60), iso(0)))!
    expect(imported.track!.v![3]).toBe(1.3)
    expect(imported.track!.alt![0]).toBe(35)
    expect(JSON.stringify(imported.track)).not.toMatch(/accuracy/)
  })

  it('Apple Watch : points espacés de 5 m, vitesse négative (inconnue) recalculée', () => {
    const walk: WatchWalk = {
      uuid: 'a',
      start: iso(0),
      end: iso(40),
      type: 'walking',
      points: [
        { lat: 48.85, lng: 2.35, time: iso(0), alt: 40, speed: 1.1 },
        { lat: 48.85005, lng: 2.35, time: iso(4) },
        { lat: 48.8501, lng: 2.35, time: iso(9), speed: -1 },
        { lat: 48.85015, lng: 2.35, time: iso(40), alt: 41 },
      ],
    }
    const track = toImported(watchActivity(walk))!.track!
    expect(track.t).toEqual([0, 9, 40])
    expect(track.alt).toEqual([40, 40, 41])
    expect(track.v![0]).toBe(1.1)
    // ~11 m en 9 s
    expect(track.v![1]).toBeCloseTo(1.24, 1)
  })
})

describe('lecture tolérante', () => {
  it('une ancienne balade sans trajet daté reste lisible', () => {
    const old: StoredRoute = { points: [{ lat: 48.85, lng: 2.35 }], distanceM: 0, moments: [] }
    const route = readRoute(old)!
    expect(route.track).toBeUndefined()
    expect(route.points).toEqual([[48.85, 2.35]])
  })

  it('un trajet daté abîmé est ignoré, le reste de la balade est lu', () => {
    expect(readTrack({ t: [0, 5], lat: [48.85], lng: [2.35, 2.35] })).toBeUndefined()
    const route = readRoute({ points: [], distanceM: 120, moments: [], track: { t: [0, 5], lat: [1, 2], lng: [3, 4], alt: [1] } })!
    expect(route.track).toEqual({ t: [0, 5], lat: [1, 2], lng: [3, 4] })
    expect(route.distanceM).toBe(120)
  })

  it('le trajet daté survit à un enregistrement des repères', () => {
    const track = buildTrack(walkPoints(20))!
    const route = readRoute(storeRoute({ points: [], distanceM: 0, moments: [], track }))!
    expect(storeRoute({ ...route, moments: [{ lat: 1, lng: 2, type: 'jeu' }] }).track).toEqual(track)
  })
})
