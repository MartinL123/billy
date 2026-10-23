import { describe, expect, it } from 'vitest'
import type { Route } from './route'
import type { Track } from './track'
import { paceLine, sheetBlocks, weatherLine } from './walkBlocks'
import { notedOutings, outingAbout, outingName, parseOutingId } from './notedOutings'

const M_PER_DEG = 111_195

/** Un trajet vers le nord, un point toutes les 5 s, à vitesse constante. */
function trackOf(seconds: number, speed: number): Track {
  const track: Track = { t: [0], lat: [48.85], lng: [2.35], v: [0] }
  for (let s = 5; s <= seconds; s += 5) {
    track.t.push(s)
    track.lat.push(48.85 + (speed * s) / M_PER_DEG)
    track.lng.push(2.35)
    track.v!.push(speed)
  }
  return track
}

const route = (extra: Partial<Route> = {}): Route => ({ points: [[48.85, 2.35], [48.86, 2.35]], distanceM: 2800, moments: [], ...extra })
const ends = [{ kind: 'depart' as const }, { kind: 'retour' as const }]

describe('R-095 · la fiche sans trous', () => {
  it('fichier daté sans arrêt : 3 chiffres (l’allure en 3ᵉ), la courbe et « sans pause », pas de frise, pas de relief à 0', () => {
    const track = trackOf(2400, 1.17)
    const b = sheetBlocks(route({ track, pace: Array(40).fill(4.2), stops: [], ascentM: 0, descentM: 0, weather: { tempC: 10.2, feelsC: 8, windKmh: 8, rainMm: 0, source: 'open-meteo' } }), { photos: 0, events: ends })
    expect(b.stats.map((s) => s.label)).toEqual(['Durée', 'Distance', 'Allure'])
    expect(b.stats.every((s) => s.value && s.value !== '0')).toBe(true)
    expect(b.pace).toBe(true)
    expect(b.paceLine).toBe('Marche tranquille, sans pause.')
    expect(b.timeline).toBe(false)
    expect(b.relief).toBe(false)
    expect(b.body).toBe(false)
    expect(b.weatherLine).toBe('10 °C, ressenti 8 °C · vent 8 km/h · sec')
    expect(b.photos).toBe(false)
  })

  it('balade complète : 4 chiffres, la frise, le relief, le corps, les photos', () => {
    const track = trackOf(2160, 1.2)
    const stops = [
      { at: 600, durS: 60, lat: 0, lng: 0 },
      { at: 1300, durS: 60, lat: 0, lng: 0 },
    ]
    const b = sheetBlocks(route({ track, stops, pace: [...Array(32).fill(4), 6, 6, 0.5, 0.5], ascentM: 14, hr: [90, 110], steps: 3200 }), { photos: 2, events: [...ends, { kind: 'stop' }] })
    expect(b.stats.map((s) => s.label)).toEqual(['Durée', 'Distance', 'En marche', 'Arrêts'])
    expect(b.paceLine).toBe('32 min tranquille · 2 min rapide · 2 min à l’arrêt')
    expect(b.timeline).toBe(true)
    expect(b.relief).toBe(true)
    expect(b.body).toBe(true)
    expect(b.photos).toBe(true)
  })

  it('« Ce qui s’est passé » : un arrêt, un repère, un passage rapide ou une photo ; jamais Départ → Retour seuls', () => {
    const base = route()
    expect(sheetBlocks(base, { photos: 0, events: [...ends, { kind: 'heart' }] }).timeline).toBe(false)
    expect(sheetBlocks(base, { photos: 0, events: [...ends, { kind: 'fast' }] }).timeline).toBe(true)
    expect(sheetBlocks(base, { photos: 0, events: [{ kind: 'moment' }] }).timeline).toBe(true)
    expect(sheetBlocks(base, { photos: 1, events: ends }).timeline).toBe(true)
  })

  it('balade ancienne sans trajet daté : ni courbe ni ligne d’allure ; relief sous 10 m caché', () => {
    const b = sheetBlocks(route({ durationMin: 30, ascentM: 9, descentM: 4 }), { photos: 0, events: [] })
    expect(b.pace).toBe(false)
    expect(b.paceLine).toBeUndefined()
    expect(b.relief).toBe(false)
    expect(b.weatherLine).toBeUndefined()
    expect(sheetBlocks(route({ descentM: 10 }), { photos: 0, events: [] }).relief).toBe(true)
  })

  it('la ligne d’allure : rapide sans pause, ou des minutes à l’arrêt', () => {
    expect(paceLine([4, 4, 6], 0)).toBe('2 min tranquille · 1 min rapide, sans pause.')
    expect(paceLine([4, 0.2], 0)).toBe('1 min tranquille · 1 min à l’arrêt')
    // Un arrêt détecté, même court : pas de « sans pause ».
    expect(paceLine([4, 4], 1)).toBe('2 min tranquille')
    expect(paceLine([], 0)).toBeUndefined()
  })

  it('la météo sur une ligne : seulement ce qu’on sait, le ressenti s’il diffère, la pluie', () => {
    expect(weatherLine({ tempC: 11, source: 'watch' })).toBe('11 °C')
    expect(weatherLine({ tempC: 11.4, feelsC: 11, rainMm: 1.25, source: 'open-meteo' })).toBe('11 °C · pluie 1,3 mm')
    expect(weatherLine(undefined)).toBeUndefined()
  })
})

describe('R-095 · les sorties notées sans trajet', () => {
  it('une par créneau noté, la plus récente d’abord ; une balade du même créneau la remplace', () => {
    const days = [
      { date: '2026-10-22', done: { soir: '19:00' }, noted: { soir: 20 } },
      { date: '2026-10-23', done: { matin: '08:00', midi: '13:00' }, noted: { matin: 35, midi: 15 } },
      { date: '2026-10-21', done: { matin: '08:00' } },
    ]
    const entries = [{ route: {}, walkSlot: { date: '2026-10-23', creneau: 'midi' } }]
    const out = notedOutings(days, entries)
    expect(out.map((o) => o.id)).toEqual(['2026-10-23:matin', '2026-10-22:soir'])
    expect(out[0]).toEqual({ id: '2026-10-23:matin', date: '2026-10-23', slot: 'matin', minutes: 35, time: '08:00' })
    expect(outingName('matin')).toBe('Sortie du matin')
    expect(outingAbout(out[0]!)).toBe('vers 8 h')
    expect(outingAbout({})).toBe('')
  })

  it('l’identifiant de l’adresse', () => {
    expect(parseOutingId('2026-10-23:soir')).toEqual({ date: '2026-10-23', slot: 'soir' })
    expect(parseOutingId('2026-10-23:nuit')).toBeUndefined()
    expect(parseOutingId('')).toBeUndefined()
  })
})
