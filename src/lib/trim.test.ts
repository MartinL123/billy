import { describe, expect, it } from 'vitest'
import { readRoute, storeRoute, type Route } from './route'
import type { Track } from './track'
import { sliceTrack, trackDistance } from './track'
import { effectiveTrack, trimRoute, untrimRoute, TRIM_MIN_S } from './trim'
import { sheetStats, walkSeconds, walkSubtitle } from './walkSheet'
import { walkTimeline } from './walkTimeline'

const M_PER_DEG = 111_195

/** Vers le nord, un point toutes les 5 s : des portions [durée en s, vitesse en m/s]. */
function trackOf(parts: [number, number][]): Track {
  const track: Track = { t: [0], lat: [48.85], lng: [2.35], v: [0] }
  let s = 0
  let lat = 48.85
  for (const [dur, speed] of parts) {
    for (let k = 0; k < dur; k += 5) {
      s += 5
      lat += (speed * 5) / M_PER_DEG
      track.t.push(s)
      track.lat.push(Math.round(lat * 1e5) / 1e5)
      track.lng.push(2.35)
      track.v!.push(speed)
    }
  }
  return track
}

// 2 min immobile au départ (oublié de lancer la balade dehors), 10 min de marche avec un arrêt, 5 min de retour en voiture.
const track = trackOf([[120, 0], [240, 1.3], [60, 0], [300, 1.3], [300, 12]])
const route: Route = {
  points: track.t.map((_, i) => [track.lat[i]!, track.lng[i]!]),
  distanceM: Math.round(trackDistance(track)),
  durationMin: 17,
  moments: [],
  track,
  startTime: '2026-10-22T06:12:00Z',
  endTime: '2026-10-22T06:29:00Z',
  stops: [{ at: 360, durS: 60, lat: 48.85, lng: 2.35, street: 'Rue Cardinet' }],
}

describe('recadrer le début et la fin (V6 § 8.3)', () => {
  it('coupe le trajet daté aux bornes, sans décaler les heures', () => {
    const kept = sliceTrack(track, [102, 720])
    expect(kept.t[0]).toBe(102)
    expect(kept.t[kept.t.length - 1]).toBe(720)
    expect(kept.lat[0]).toBeCloseTo(48.85, 5)
    expect(kept.t.length).toBe(kept.lat.length)
  })

  it('recalcule distance, durée, arrêts et allure ; garde le trajet d’origine', () => {
    const trimmed = trimRoute(route, 120, 720)
    expect(trimmed.trimmed).toMatchObject({ startS: 120, endS: 720 })
    expect(trimmed.trimmed!.original).toMatchObject({ distanceM: route.distanceM, durationMin: 17 })
    expect(trimmed.trimmed!.original!.points).toHaveLength(route.points.length)
    // 540 s à 1,3 m/s = 702 m (la voiture est retirée).
    expect(trimmed.distanceM).toBeGreaterThan(690)
    expect(trimmed.distanceM).toBeLessThan(715)
    expect(trimmed.durationMin).toBe(10)
    expect(trimmed.track).toBe(track)
    expect(trimmed.pace).toHaveLength(10)
    expect(trimmed.pace!.every((k) => k < 6)).toBe(true)
    // L’arrêt du milieu reste, avec sa rue.
    expect(trimmed.stops).toEqual([expect.objectContaining({ at: 360, durS: 60, street: 'Rue Cardinet' })])
    expect(trimmed.points[0]![0]).toBeCloseTo(48.85, 5)
  })

  it('montre partout la portion gardée : durée, heures, frise', () => {
    const trimmed = trimRoute(route, 120, 720)
    expect(walkSeconds(trimmed)).toBe(600)
    expect(sheetStats(trimmed)[0]).toMatchObject({ value: '10\u00a0min', label: 'Durée' })
    expect(walkSubtitle({ date: '2026-10-22', startTime: trimmed.startTime, endTime: trimmed.endTime, trimmed: trimmed.trimmed })).toContain('8 h 14 → 8 h 24')
    const events = walkTimeline(trimmed)
    expect(events[0]).toMatchObject({ kind: 'depart', atS: 120 })
    expect(events[events.length - 1]).toMatchObject({ kind: 'retour', atS: 720 })
    expect(effectiveTrack(trimmed)!.t[0]).toBe(120)
  })

  it('se relit après l’enregistrement, et revient au trajet d’origine', () => {
    const stored = storeRoute(trimRoute(route, 120, 720))
    const read = readRoute(JSON.parse(JSON.stringify(stored)))!
    expect(read.trimmed).toMatchObject({ startS: 120, endS: 720 })
    const back = untrimRoute(read)
    expect(back.trimmed).toBeUndefined()
    expect(back.distanceM).toBe(route.distanceM)
    expect(back.durationMin).toBe(17)
    expect(back.points).toEqual(route.points)
    expect(back.pace!.length).toBeGreaterThan(15)
  })

  it('un deuxième recadrage part du trajet entier ; toute la balade = pas de recadrage ; 2 min au moins', () => {
    const twice = trimRoute(trimRoute(route, 120, 720), 60, 700)
    expect(twice.trimmed!.original!.distanceM).toBe(route.distanceM)
    expect(twice.trimmed).toMatchObject({ startS: 60, endS: 700 })
    expect(trimRoute(twice, -50, 99_999).trimmed).toBeUndefined()
    const tiny = trimRoute(route, 300, 310)
    expect(tiny.trimmed!.endS - tiny.trimmed!.startS).toBe(TRIM_MIN_S)
  })

  it('un recadrage illisible ou sans trajet daté est ignoré à la lecture', () => {
    const { track: _t, ...noTrack } = storeRoute(trimRoute(route, 120, 720))
    expect(readRoute(noTrack)!.trimmed).toBeUndefined()
    expect(readRoute({ ...storeRoute(route), trimmed: { startS: 500, endS: 100 } })!.trimmed).toBeUndefined()
  })
})
