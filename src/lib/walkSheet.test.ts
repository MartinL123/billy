import { describe, expect, it } from 'vitest'
import type { Route } from './route'
import type { Track } from './track'
import { averageKmh, clockLabel, hrSummary, kmSplits, paceAt, paceSegments, paceSummary, sheetStats, sourceLabels, sourceLine, splitLabel, splitTime, untoldStops, walkSeconds, walkSubtitle, weatherText } from './walkSheet'

const M_PER_DEG = 111_195

/** Un trajet vers le nord, un point toutes les 5 s : des portions [durée en s, vitesse en m/s]. */
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

const route = (extra: Partial<Route> = {}): Route => ({ points: [[48.85, 2.35], [48.86, 2.35]], distanceM: 2100, moments: [], ...extra })

describe('la fiche de balade : textes', () => {
  it('heures à la française', () => {
    expect(clockLabel(492)).toBe('8 h 12')
    expect(clockLabel(485)).toBe('8 h 05')
    expect(clockLabel(1140)).toBe('19 h')
  })

  it('sous-titre : jour, heures (Paris), commune, seulement ce qu’on sait', () => {
    expect(walkSubtitle({ date: '2026-10-22', startTime: '2026-10-22T06:12:00Z', endTime: '2026-10-22T06:44:00Z', commune: 'Vertbois' })).toBe('Jeudi 22 octobre · 8 h 12 → 8 h 44 · Vertbois')
    expect(walkSubtitle({ date: '2026-10-22' })).toBe('Jeudi 22 octobre')
    expect(walkSubtitle({ date: '2026-10-22', startTime: 'n’importe quoi' })).toBe('Jeudi 22 octobre')
  })

  it('météo', () => {
    expect(weatherText({ tempC: 14.4, source: 'open-meteo' })).toBe('14 °C')
    expect(weatherText({ tempC: 14, humidity: 80, source: 'watch' })).toBe('14 °C · 80 % d’humidité')
    expect(weatherText(undefined)).toBeUndefined()
  })
})

describe('les chiffres', () => {
  it('durée : début → fin, sinon le trajet daté, sinon la durée notée', () => {
    expect(walkSeconds({ startTime: '2026-10-22T06:12:00Z', endTime: '2026-10-22T06:44:00Z' })).toBe(32 * 60)
    expect(walkSeconds({ track: trackOf([[600, 1.3]]) })).toBe(600)
    expect(walkSeconds({ durationMin: 20 })).toBe(1200)
    expect(walkSeconds({})).toBeUndefined()
  })

  it('Stats : durée · distance · en marche · arrêts ; une balade ancienne n’a que durée et distance', () => {
    const track = trackOf([[300, 1.3], [120, 0], [300, 1.3]])
    const stats = sheetStats(route({ track, stops: [{ at: 300, durS: 120, lat: 0, lng: 0 }] }))
    expect(stats.map((s) => [s.label, s.value])).toEqual([
      ['Durée', '12 min'],
      ['Distance', '2,1 km'],
      ['En marche', '10 min'],
      ['Arrêt', '1'],
    ])
    expect(sheetStats(route({ durationMin: 25 })).filter((s) => s.value).map((s) => s.label)).toEqual(['Durée', 'Distance'])
  })

  it('allure moyenne en marche', () => {
    const track = trackOf([[600, 1.25], [120, 0]])
    expect(averageKmh(route({ track, distanceM: 750, stops: [{ at: 600, durS: 120, lat: 0, lng: 0 }] }))).toBe(4.5)
    expect(averageKmh(route({ distanceM: 0 }))).toBeUndefined()
  })

  it('km par km, et le dernier bout s’il fait 100 m ou plus', () => {
    // 1 m/s : 1 000 m en 1 000 s, puis 450 m.
    const splits = kmSplits(trackOf([[1450, 1]]))
    expect(splits).toHaveLength(2)
    expect(splits[0]).toEqual({ km: 1, seconds: 1000 })
    expect(splits[1]!.meters).toBe(450)
    expect(splits[1]!.seconds).toBe(450)
    expect(splitLabel(splits[0]!)).toBe('1er km')
    expect(splitLabel({ km: 2, seconds: 1 })).toBe('2e km')
    expect(splitLabel(splits[1]!)).toBe('Fin · 450 m')
    expect(splitTime(750)).toBe('12 min 30')
    expect(kmSplits(trackOf([[1050, 1]]))).toHaveLength(1)
  })

  it('cœur moyen et maximum', () => {
    expect(hrSummary([90, 100, 110, 0])).toEqual({ avg: 100, max: 110, min: 90 })
    expect(hrSummary(undefined)).toBeUndefined()
  })

  it('sources : chaque chiffre dit d’où il vient', () => {
    expect(sourceLabels({ source: 'watch', hr: [90], moments: [], weather: { tempC: 12, source: 'watch' } })).toEqual({ track: 'Watch', health: 'Apple Watch', weather: 'Météo : Apple Watch' })
    expect(sourceLabels({ source: 'gps', steps: 3000, moments: [], weather: { tempC: 12, source: 'open-meteo' }, stops: [{ at: 1, durS: 40, lat: 0, lng: 0, street: 'Rue A' }] })).toEqual({ track: 'iPhone', health: 'Santé (Apple Watch)', weather: 'Météo : Open-Meteo', places: 'Lieux © OpenStreetMap' })
    expect(sourceLabels({ moments: [] })).toEqual({ track: 'Notée' })
    expect(sourceLabels({ source: 'gpx', moments: [] }, 'strava')).toEqual({ track: 'Fichier' })
    expect(sourceLabels({ moments: [] }, 'strava')).toEqual({ track: 'Fichier' })
  })

  it('T-102 : la ligne des sources, sans nom de propriétaire', () => {
    expect(sourceLine({ source: 'watch', hr: [90], moments: [], weather: { tempC: 12, source: 'open-meteo' }, streets: [{ name: 'Rue des Lilas' }] })).toBe('Enregistré par l’Apple Watch · Météo Open-Meteo · Lieux © OpenStreetMap')
    expect(sourceLine({ source: 'gps', steps: 3000, moments: [], weather: { tempC: 12, source: 'watch', daylight: 'jour' } })).toBe('Enregistré par l’iPhone · Cœur et pas\u00a0: Santé (Apple Watch) · Météo Apple Watch et Open-Meteo')
    expect(sourceLine({ moments: [] }, 'strava')).toBe('Importé d’un fichier')
    expect(sourceLine({ moments: [] })).toBe('Tracé à la main')
  })
})

describe('l’allure', () => {
  it('portions de couleur : les minutes de même allure se suivent sans couper le trait', () => {
    const track = trackOf([[120, 1.2], [60, 0], [60, 2]])
    const segments = paceSegments(track, [4.3, 4.3, 0, 7.2])
    expect(segments.map((s) => s.category)).toEqual(['tranquille', 'arret', 'rapide'])
    expect(segments[1]!.points[0]).toEqual(segments[0]!.points[segments[0]!.points.length - 1])
  })

  it('le doigt sur la courbe : heure, vitesse, rue de l’arrêt de cette minute', () => {
    const track = trackOf([[120, 1.2], [60, 0], [60, 1.2]])
    const r = route({ track, pace: [4.3, 4.3, 0, 4.3], startTime: '2026-10-22T06:12:00Z', stops: [{ at: 120, durS: 60, lat: 48.8513, lng: 2.35, street: 'Square Ampère' }] })
    expect(paceAt(r, 2)).toMatchObject({ clock: '8 h 14', kmh: 0, category: 'arret', street: 'Square Ampère' })
    expect(paceAt(r, 9)).toBeUndefined()
    expect(paceAt(route(), 0)).toBeUndefined()
  })

  it('résumé lu par VoiceOver', () => {
    expect(paceSummary([4, 4, 6, 0.5])).toBe('Allure minute par minute : 2 min de marche tranquille, 1 min rapide, 1 min à l’arrêt.')
    expect(paceSummary([])).toBe('')
  })
})

it('« Raconter la balade » : les arrêts sans repère', () => {
  expect(untoldStops({ stops: [{ at: 1, durS: 40, lat: 0, lng: 0 }, { at: 100, durS: 40, lat: 0, lng: 0, momentIndex: 0 }] })).toHaveLength(1)
  expect(untoldStops({})).toEqual([])
})
