import { describe, expect, it } from 'vitest'
import type { Route } from './route'
import type { Track } from './track'
import { timelineText, walkTimeline } from './walkTimeline'

const M_PER_DEG = 111_195

function trackOf(parts: [number, number][]): Track {
  const track: Track = { t: [0], lat: [48.85], lng: [2.35], v: [0] }
  let s = 0
  let lat = 48.85
  for (const [dur, speed] of parts) {
    for (let k = 0; k < dur; k += 5) {
      s += 5
      lat += (speed * 5) / M_PER_DEG
      track.t.push(s)
      track.lat.push(lat)
      track.lng.push(2.35)
      track.v!.push(speed)
    }
  }
  return track
}

const latAt = (s: number, speed = 1.3) => 48.85 + (s * speed) / M_PER_DEG

describe('la frise « Ce qui s’est passé » (V6 § 6.2)', () => {
  it('départ, arrêts, repère hors arrêt, moment rapide, retour : dans l’ordre', () => {
    // 2 min à 1,3 m/s, arrêt 1 min, 1 min à 1,3, 3 min à 2 m/s (rapide), 1 min à 1,3.
    const track = trackOf([[120, 1.3], [60, 0], [60, 1.3], [180, 2], [60, 1.3]])
    const route: Route = {
      points: [[48.85, 2.35]],
      distanceM: 700,
      track,
      startTime: '2026-10-22T06:12:00Z',
      weather: { tempC: 14, source: 'open-meteo' },
      moments: [{ lat: latAt(140), lng: 2.35, type: 'jeu' }, { lat: latAt(120), lng: 2.35, type: 'peur' }],
      stops: [{ at: 120, durS: 60, lat: latAt(120), lng: 2.35, street: 'Square Ampère', momentIndex: 1 }],
    }
    const events = walkTimeline(route, { startStreet: 'Rue Anselme' })
    expect(events.map((e) => e.kind)).toEqual(['depart', 'stop', 'moment', 'fast', 'retour'])
    const stop = events[1]!
    expect(stop.kind === 'stop' && stop.moment?.type).toBe('peur')
    expect(timelineText(events[0]!, route.startTime)).toEqual({ title: 'Départ', clock: '8 h 12', detail: 'Rue Anselme · 14 °C' })
    expect(timelineText(stop, route.startTime)).toEqual({ title: 'Arrêt de 1 min', clock: '8 h 14', detail: 'Square Ampère' })
    expect(timelineText(events[2]!, route.startTime).title).toBe('Jeu')
    expect(timelineText(events[3]!).detail).toMatch(/^7,\d km\/h sur \d+ m · il a tiré \?$/)
    expect(timelineText(events[4]!, route.startTime)).toEqual({ title: 'Retour', clock: '8 h 20' })
  })

  it('un pic de cœur pendant un arrêt se lit sur l’arrêt ; sinon, sa propre ligne', () => {
    const track = trackOf([[120, 1.3], [120, 0], [240, 1.3]])
    const base: Route = { points: [[48.85, 2.35]], distanceM: 500, moments: [], track, stops: [{ at: 120, durS: 120, lat: latAt(120), lng: 2.35 }] }
    const onStop = walkTimeline({ ...base, hr: [90, 92, 118, 100, 95, 95, 95, 95] })
    const stop = onStop.find((e) => e.kind === 'stop')!
    expect(stop.kind === 'stop' && stop.heart).toBe(118)
    expect(timelineText(stop).detail).toBe('votre cœur à 118')
    const alone = walkTimeline({ ...base, hr: [90, 92, 92, 92, 92, 92, 118, 95] })
    expect(alone.some((e) => e.kind === 'heart')).toBe(true)
    expect(timelineText(alone.find((e) => e.kind === 'heart')!).title).toBe('Votre cœur à 118')
  })

  it('une balade ancienne sans trajet daté : seulement ses repères, dans l’ordre du tracé', () => {
    const route: Route = {
      points: [[48.85, 2.35], [48.86, 2.35], [48.87, 2.35]],
      distanceM: 2000,
      moments: [{ lat: 48.87, lng: 2.35, type: 'jeu' }, { lat: 48.85, lng: 2.35, type: 'marque', street: 'Rue B' }],
    }
    const events = walkTimeline(route)
    expect(events.map((e) => (e.kind === 'moment' ? e.moment.type : e.kind))).toEqual(['marque', 'jeu'])
    expect(timelineText(events[0]!)).toEqual({ title: 'Pipi', detail: 'Rue B' })
    expect(walkTimeline({ points: [], distanceM: 0, moments: [] })).toEqual([])
  })
})
