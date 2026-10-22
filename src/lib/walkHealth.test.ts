import { describe, expect, it } from 'vitest'
import { parseActivity, toImported } from './activity'
import { gpsActivity } from './gpsWalk'
import { elevation, hrPerMinute, missingElevation, pausesSince, watchWeather } from './walkHealth'
import { watchActivity, type WatchWalk } from './watch'

const START = '2026-10-12T14:00:00.000Z'
const at = (s: number) => new Date(Date.parse(START) + s * 1000).toISOString()

describe('cœur par minute (V6 § 2.1)', () => {
  it('une moyenne par minute depuis le départ, arrondie', () => {
    expect(hrPerMinute([{ time: at(5), bpm: 90 }, { time: at(30), bpm: 93 }, { time: at(65), bpm: 110 }], START)).toEqual([92, 110])
  })

  it('une minute sans valeur reprend la précédente ; le début prend la première connue', () => {
    expect(hrPerMinute([{ time: at(70), bpm: 100 }, { time: at(200), bpm: 120 }], START)).toEqual([100, 100, 100, 120])
  })

  it('ignore les valeurs hors de la balade et les erreurs de capteur', () => {
    expect(hrPerMinute([{ time: at(-30), bpm: 80 }, { time: at(10), bpm: 0 }, { time: at(20), bpm: 95 }, { time: at(500), bpm: 99 }], START, at(120))).toEqual([95])
  })

  it('rien sans échantillon', () => {
    expect(hrPerMinute(undefined, START)).toBeUndefined()
    expect(hrPerMinute([{ time: 'n’importe', bpm: 90 }], START)).toBeUndefined()
  })
})

describe('dénivelé (V6 § 2.2)', () => {
  it('compte montées et descentes', () => {
    expect(elevation([100, 110, 120, 105])).toEqual({ ascentM: 20, descentM: 15 })
  })

  it('ignore le bruit du GPS sous 3 m', () => {
    expect(elevation([100, 101.5, 99.2, 101, 100.4, 98.8, 100.9])).toEqual({ ascentM: 0, descentM: 0 })
  })

  it('une montée lente, faite de petits pas, compte quand même', () => {
    expect(elevation([100, 101, 102, 103, 104, 105, 106])).toEqual({ ascentM: 6, descentM: 0 })
  })

  it('rien sans altitude ; rattrapage seulement s’il manque', () => {
    expect(elevation(undefined)).toBeUndefined()
    expect(missingElevation({ track: { alt: [10, 20] } })).toEqual({ ascentM: 10, descentM: 0 })
    expect(missingElevation({ track: { alt: [10, 20] }, ascentM: 3 })).toBeUndefined()
    expect(missingElevation({})).toBeUndefined()
  })
})

describe('pauses et météo de la Watch', () => {
  it('les pauses en secondes depuis le départ', () => {
    expect(pausesSince([{ start: at(300), end: at(360) }, { start: at(400), end: at(390) }], START)).toEqual([{ startS: 300, endS: 360 }])
    expect(pausesSince([], START)).toBeUndefined()
  })

  it('la météo de la Watch, si la température est là', () => {
    expect(watchWeather({ tempC: 12.345, humidity: 81.6 })).toEqual({ tempC: 12.3, humidity: 82, source: 'watch' })
    expect(watchWeather({ humidity: 80 })).toBeUndefined()
  })
})

/** Une marche de la Watch vers le nord, un point toutes les 5 s à 1,3 m/s, avec une pause de 60 s à 5 min. */
function watchWalk(extra: Partial<WatchWalk> = {}): WatchWalk {
  const points: WatchWalk['points'] = []
  let lat = 48.85
  for (let s = 0; s <= 600; s += 5) {
    const paused = s > 300 && s <= 360
    if (!paused) lat += (1.3 * 5) / 111_195
    points.push({ lat, lng: 2.35, time: at(s), alt: 100 + s / 20, speed: paused ? 0 : 1.3 })
  }
  return { uuid: 'u', start: START, end: at(600), type: 'walking', points, ...extra }
}

describe('import avec cœur, pas, dénivelé, météo, énergie (T-080)', () => {
  it('une séance Watch garde tout ce que Santé donne', () => {
    const walk = toImported(
      watchActivity(
        watchWalk({
          hr: [{ time: at(10), bpm: 95 }, { time: at(70), bpm: 101 }],
          steps: 1234.4,
          energy: 56.7,
          weather: { tempC: 14.2, humidity: 70 },
          pauses: [{ start: at(300), end: at(360) }],
        }),
      ),
    )!
    expect(walk.hr).toEqual([95, 101])
    expect(walk.steps).toBe(1234)
    expect(walk.energyKcal).toBe(57)
    expect(walk.weather).toEqual({ tempC: 14.2, humidity: 70, source: 'watch' })
    expect(walk.ascentM).toBe(30)
    expect(walk.descentM).toBe(0)
    expect(walk.pauses).toEqual([{ startS: 300, endS: 360 }])
    // La pause devient un arrêt.
    expect(walk.stops).toEqual([expect.objectContaining({ at: 300, durS: 60 })])
  })

  it('une séance Watch d’une app iOS plus ancienne (sans ces champs) s’importe comme avant', () => {
    const walk = toImported(watchActivity(watchWalk()))!
    expect(walk.hr).toBeUndefined()
    expect(walk.steps).toBeUndefined()
    expect(walk.weather).toBeUndefined()
    expect(walk.pauses).toBeUndefined()
    expect(walk.ascentM).toBe(30)
  })

  it('la balade du GPS de Flair prend cœur, pas et énergie de Santé, sinon rien', () => {
    const points = watchWalk().points.map(({ lat, lng, time }) => ({ lat, lng, time }))
    const withHealth = toImported(gpsActivity(points, START, { hr: [{ time: at(30), bpm: 88 }], steps: 900, energy: 40 }))!
    expect(withHealth).toMatchObject({ hr: [88], steps: 900, energyKcal: 40 })
    const without = toImported(gpsActivity(points, START, {}))!
    expect(without.hr).toBeUndefined()
    expect(without.steps).toBeUndefined()
    expect(without.ascentM).toBeUndefined()
  })

  it('un GPX garde gpxtpx:hr en valeur par minute', () => {
    const pts = [0, 30, 65, 90]
      .map((s, i) => `<trkpt lat="${45 + i * 0.0005}" lon="1"><ele>${10 + i * 4}</ele><time>${at(s)}</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${100 + i * 10}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`)
      .join('')
    const walk = toImported(parseActivity(`<gpx><trk><trkseg>${pts}</trkseg></trk></gpx>`))!
    expect(walk.hr).toEqual([105, 125])
    expect(walk.ascentM).toBe(12)
    expect(walk.weather).toBeUndefined()
  })
})
