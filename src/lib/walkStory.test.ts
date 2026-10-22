import { describe, expect, it } from 'vitest'
import { toImported } from './activity'
import { gpsActivity } from './gpsWalk'
import { storeRoute } from './route'
import type { Track } from './track'
import { fastMoment, findStops, heartPeak, linkMoments, missingStory, movingSeconds, paceByMinute, paceCategory, routeStory, stopsWithoutStreet, walkStory, withStreets } from './walkStory'

const M_PER_DEG = 111_195

/**
 * Un trajet de test vers le nord, un point toutes les 5 s (comme `track`) : une suite de portions [durée en s, vitesse
 * en m/s]. La vitesse d’un point est celle de la portion qu’il vient de parcourir (comme celle du GPS).
 */
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

const WALK = 1.3

describe('les arrêts (V6 § 3)', () => {
  it('un arrêt de 30 s est détecté, à sa place', () => {
    const stops = findStops(trackOf([[120, WALK], [30, 0], [120, WALK]]))
    expect(stops).toHaveLength(1)
    expect(stops[0]).toMatchObject({ at: 120, durS: 30 })
    expect(stops[0]!.lat).toBeCloseTo(48.85 + (120 * WALK) / M_PER_DEG, 5)
  })

  it('un arrêt de 25 s est ignoré', () => {
    expect(findStops(trackOf([[120, WALK], [25, 0], [120, WALK]]))).toEqual([])
  })

  it('deux arrêts séparés de moins de 20 s fusionnent', () => {
    const stops = findStops(trackOf([[120, WALK], [40, 0], [10, WALK], [40, 0], [120, WALK]]))
    expect(stops).toHaveLength(1)
    expect(stops[0]).toMatchObject({ at: 120, durS: 90 })
  })

  it('deux arrêts bien séparés restent deux', () => {
    expect(findStops(trackOf([[120, WALK], [40, 0], [60, WALK], [40, 0], [120, WALK]]))).toHaveLength(2)
  })

  it('pas d’arrêt au départ ni au retour', () => {
    expect(findStops(trackOf([[60, 0], [300, WALK], [60, 0]]))).toEqual([])
  })

  it('une marche très lente qui sort du rayon de 25 m n’est pas un arrêt', () => {
    // 0,3 m/s pendant 4 min : 72 m parcourus.
    expect(findStops(trackOf([[120, WALK], [240, 0.3], [120, WALK]]))).toEqual([])
  })

  it('une pause de la Watch compte comme un arrêt', () => {
    const stops = findStops(trackOf([[300, WALK]]), { pauses: [{ startS: 100, endS: 160 }] })
    expect(stops).toEqual([expect.objectContaining({ at: 100, durS: 60 })])
  })

  it('un GPS immobile (pas de point pendant 60 s) donne un arrêt', () => {
    const track = trackOf([[120, WALK]])
    const last = track.t.length - 1
    // 60 s sans point : le GPS de l’iPhone n’envoie rien tant qu’on ne bouge pas de 5 m.
    track.t.push(185)
    track.lat.push(track.lat[last]! + 5 / M_PER_DEG)
    track.lng.push(2.35)
    track.v!.push(WALK)
    const rest = trackOf([[120, WALK]])
    for (let i = 1; i < rest.t.length; i++) {
      track.t.push(185 + rest.t[i]!)
      track.lat.push(track.lat[last + 1]! + (rest.lat[i]! - 48.85))
      track.lng.push(2.35)
      track.v!.push(WALK)
    }
    // Le point suivant arrive à 185 s, 5 m plus loin : l’arrêt dure jusqu’à lui.
    expect(findStops(track)).toEqual([expect.objectContaining({ at: 120, durS: 65 })])
  })

  it('le recadrage : un arrêt hors de la fenêtre, ou trop près de son bord, disparaît', () => {
    const track = trackOf([[120, WALK], [60, 0], [300, WALK], [60, 0], [120, WALK]])
    expect(findStops(track)).toHaveLength(2)
    expect(findStops(track, { window: [0, 400] })).toEqual([expect.objectContaining({ at: 120 })])
    expect(findStops(track, { window: [150, 660] })).toEqual([expect.objectContaining({ at: 480 })])
  })
})

describe('l’allure', () => {
  it('une valeur par minute, en km/h à 1 décimale', () => {
    const pace = paceByMinute(trackOf([[60, WALK], [60, 0], [60, 2], [30, WALK]]))
    expect(pace).toEqual([4.7, 0, 7.2, 4.7])
  })

  it('les catégories : arrêt, tranquille, rapide', () => {
    expect(paceCategory(0.8)).toBe('arret')
    expect(paceCategory(1.5)).toBe('tranquille')
    expect(paceCategory(5.2)).toBe('tranquille')
    expect(paceCategory(6.1)).toBe('rapide')
  })

  it('en marche = durée − arrêts', () => {
    const track = trackOf([[120, WALK], [60, 0], [120, WALK]])
    expect(movingSeconds(track, findStops(track))).toBe(240)
  })
})

describe('le moment rapide', () => {
  it('la plus longue portion au-dessus de 5,2 km/h sur 150 m ou plus', () => {
    // 2 m/s = 7,2 km/h : 60 s → 120 m (trop court), puis 150 s → 300 m.
    const fast = fastMoment(trackOf([[120, WALK], [60, 2], [120, WALK], [150, 2], [120, WALK]]))!
    expect(fast.kmh).toBeCloseTo(7.2, 0)
    expect(fast.meters).toBeGreaterThan(280)
    expect(fast.meters).toBeLessThan(320)
    expect(fast.startS).toBeGreaterThan(290)
    expect(fast.startS).toBeLessThan(310)
  })

  it('rien si la balade reste tranquille', () => {
    expect(fastMoment(trackOf([[600, WALK]]))).toBeUndefined()
  })
})

describe('le pic de cœur', () => {
  const track = trackOf([[180, WALK], [60, WALK], [60, 2.2], [120, WALK]])

  it('une hausse de plus de 20 bpm sans accélération', () => {
    expect(heartPeak(track, [95, 96, 97, 122, 120, 100, 98])).toEqual({ atS: 180, bpm: 122 })
  })

  it('rien si le cœur monte parce qu’on accélère', () => {
    // La minute 4 (240 à 300 s) est rapide : la hausse s’explique.
    expect(heartPeak(track, [95, 96, 97, 98, 125, 100, 98])).toBeUndefined()
  })

  it('rien sans rythme cardiaque, ni pour une hausse de 20 bpm tout juste', () => {
    expect(heartPeak(track, undefined)).toBeUndefined()
    expect(heartPeak(track, [95, 115])).toBeUndefined()
  })
})

describe('le lien avec les repères', () => {
  it('un repère à moins de 40 m d’un arrêt s’y rattache', () => {
    const stop = { at: 120, durS: 60, lat: 48.85, lng: 2.35 }
    expect(linkMoments([stop], [{ lat: 48.86, lng: 2.35 }, { lat: 48.8502, lng: 2.35 }])).toEqual([{ ...stop, momentIndex: 1 }])
    expect(linkMoments([{ ...stop, momentIndex: 0 }], [{ lat: 48.86, lng: 2.35 }])).toEqual([stop])
  })
})

describe('l’histoire complète', () => {
  it('arrêts, allure et temps en marche ; le recadrage enregistré est respecté', () => {
    const track = trackOf([[120, WALK], [60, 0], [120, WALK]])
    const story = walkStory(track, { moments: [{ lat: 48.85 + (120 * WALK) / M_PER_DEG, lng: 2.35 }] })
    expect(story.stops).toEqual([expect.objectContaining({ at: 120, durS: 60, momentIndex: 0 })])
    expect(story.pace).toHaveLength(5)
    expect(story.movingS).toBe(240)
    expect(routeStory({ track, trimmed: { startS: 200, endS: 300 } })).toEqual({ stops: [], pace: [4.7, 4.7] })
    expect(routeStory({})).toBeUndefined()
  })
})

describe('le rattrapage des balades déjà là', () => {
  const track = trackOf([[120, WALK], [60, 0], [120, WALK]])

  it('calcule seulement ce qui manque, jamais sans trajet daté', () => {
    expect(missingStory({})).toBeUndefined()
    expect(missingStory({ track })).toEqual({ stops: [expect.objectContaining({ at: 120 })], pace: expect.any(Array) })
    expect(missingStory({ track, stops: [] })).toEqual({ pace: expect.any(Array) })
    expect(missingStory({ track, stops: [], pace: [] })).toBeUndefined()
  })

  it('ajoute les rues trouvées sans toucher aux autres', () => {
    const stops = [
      { at: 120, durS: 60, lat: 48.85, lng: 2.35 },
      { at: 400, durS: 40, lat: 48.86, lng: 2.35, street: 'Rue Haute' },
    ]
    expect(stopsWithoutStreet(stops)).toEqual([stops[0]])
    expect(withStreets(stops, new Map([[120, 'Rue Basse'], [400, 'Autre']]))).toEqual([{ ...stops[0], street: 'Rue Basse' }, stops[1]])
    expect(withStreets(stops, new Map())).toBe(stops)
  })
})

describe('à l’import', () => {
  it('une balade de l’iPhone arrive avec ses arrêts et son allure ; les repères s’y rattachent à l’enregistrement', () => {
    const start = Date.parse('2026-10-22T07:00:00Z')
    const points = []
    let lat = 48.85
    for (let s = 0; s <= 300; s++) {
      const moving = s < 120 || s >= 180
      if (moving && s > 0) lat += WALK / M_PER_DEG
      points.push({ lat, lng: 2.35, time: new Date(start + s * 1000).toISOString(), speed: moving ? WALK : 0 })
    }
    const walk = toImported(gpsActivity(points, new Date(start).toISOString()))!
    // Un point toutes les 5 s : les bords de l’arrêt sont précis à 5 s près.
    expect(walk.stops).toHaveLength(1)
    expect(walk.stops![0]!.at).toBeGreaterThanOrEqual(115)
    expect(walk.stops![0]!.at + walk.stops![0]!.durS).toBeGreaterThanOrEqual(175)
    expect(walk.stops![0]!.at + walk.stops![0]!.durS).toBeLessThanOrEqual(185)
    expect(walk.pace).toHaveLength(5)
    const stop = walk.stops![0]!
    const stored = storeRoute({ points: walk.points, distanceM: walk.distanceM, moments: [{ lat: stop.lat, lng: stop.lng, type: 'jeu' }], stops: walk.stops })
    expect(stored.stops![0]!.momentIndex).toBe(0)
  })
})
