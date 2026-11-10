import { describe, expect, it } from 'vitest'
import { autoVerdict, autoWalkLines, autoWalkNotice, cardLater, homeSuggestions, showAutoWalkCard, isCarTrip, overlapsTrack, sortAutoTracks, type AutoPoint, type AutoTrack } from './autoWalk'

const at = (day: number, h: number, m: number, s = 0) => new Date(2026, 10, day, h, m, s).toISOString()

/** Un tracé vers le nord, un point par `stepS` secondes, `metersPerStep` m entre deux points. */
function line(day: number, h: number, m: number, count: number, stepS: number, metersPerStep: number): AutoPoint[] {
  return Array.from({ length: count }, (_, i) => ({ lat: 48.9 + (i * metersPerStep) / 111_195, lng: 2.33, time: new Date(new Date(2026, 10, day, h, m).getTime() + i * stepS * 1000).toISOString() }))
}

// Le 10 nov. : départ 17 h 20, retour 17 h 52, ~1,9 km à pied (1,2 m/s).
const walk: AutoTrack = { id: 'a', startedAt: at(10, 17, 20), endedAt: at(10, 17, 52), points: line(10, 17, 20, 65, 30, 30) }
const NOW = new Date(2026, 10, 10, 18, 0).getTime()

describe('T-122 · balade enregistrée seule', () => {
  it('une vraie balade : proposée', () => {
    expect(autoVerdict(walk, { walks: [], now: NOW })).toBe('keep')
  })

  it('moins de 10 min ou 300 m : effacée', () => {
    expect(autoVerdict({ ...walk, endedAt: at(10, 17, 29) }, { walks: [], now: NOW })).toBe('short')
    expect(autoVerdict({ ...walk, points: line(10, 17, 20, 10, 60, 25) }, { walks: [], now: NOW })).toBe('short')
  })

  it('en voiture (plus de 15 km/h tenus 2 min) : effacée ; une courte accélération ne compte pas', () => {
    const car = [...line(10, 17, 20, 10, 30, 30), ...line(10, 17, 25, 10, 15, 100).map((p) => ({ ...p, lat: p.lat + 0.003 }))]
    expect(isCarTrip(car)).toBe(true)
    expect(autoVerdict({ ...walk, points: car }, { walks: [], now: NOW })).toBe('car')
    // 1 min à 20 km/h (un sprint derrière la balle) puis la marche.
    const sprint = [...line(10, 17, 20, 5, 15, 85), ...line(10, 17, 21, 40, 30, 30).map((p) => ({ ...p, lat: p.lat + 0.004 }))]
    expect(isCarTrip(sprint)).toBe(false)
    // La vitesse donnée par l'iPhone fait foi.
    expect(isCarTrip(line(10, 17, 20, 20, 15, 10).map((p) => ({ ...p, speed: 6 })))).toBe(true)
  })

  it('une séance Watch ou « Partir en balade » au même moment : effacée', () => {
    expect(autoVerdict(walk, { walks: [{ route: { startTime: at(10, 17, 25), endTime: at(10, 17, 50) } }], now: NOW })).toBe('covered')
    expect(autoVerdict(walk, { walks: [{ route: { startTime: at(10, 16, 0), durationMin: 30 } }], now: NOW })).toBe('keep')
  })

  it('sans réponse depuis 14 jours : effacée', () => {
    expect(autoVerdict(walk, { walks: [], now: NOW + 15 * 86_400_000 })).toBe('expired')
    expect(autoVerdict(walk, { walks: [], now: NOW + 13 * 86_400_000 })).toBe('keep')
  })

  it('tri : à proposer du plus ancien au plus récent, le reste à effacer', () => {
    const later = { ...walk, id: 'b', startedAt: at(10, 8, 0), endedAt: at(10, 8, 40), points: line(10, 8, 0, 80, 30, 30) }
    const short = { ...walk, id: 'c', endedAt: at(10, 17, 25) }
    const r = sortAutoTracks([walk, short, later], { walks: [], now: NOW })
    expect(r.keep.map((t) => t.id)).toEqual(['b', 'a'])
    expect(r.drop.map((t) => t.id)).toEqual(['c'])
  })

  it('remplace la sortie repérée par l’iPhone au même moment', () => {
    const outings = [
      { start: at(10, 17, 22), end: at(10, 17, 50) },
      { start: at(10, 11, 0), end: at(10, 11, 25) },
    ]
    expect(overlapsTrack(walk, outings)).toEqual([outings[0]])
  })

  it('les textes de la feuille', () => {
    expect(autoWalkLines(walk, '2026-11-10')).toEqual({ when: 'Aujourd’hui · 17 h 20 → 17 h 52', what: '32\u00a0min · 1,9\u00a0km · sortie de l’après-midi' })
    expect(autoWalkLines({ ...walk, startedAt: at(9, 19, 0), endedAt: at(9, 19, 30) }, '2026-11-10').when).toBe('Hier · 19 h → 19 h 30')
    expect(autoWalkLines({ ...walk, startedAt: at(7, 19, 0), endedAt: at(7, 19, 30) }, '2026-11-10').when).toBe('Sam. 7 nov. · 19 h → 19 h 30')
  })

  it('les points de départ proposés : les 2 plus fréquents, nommés par leur commune', () => {
    const w = (lat: number, lng: number, commune?: string) => ({ route: { points: [[lat, lng]] as [number, number][] }, ...(commune ? { commune } : {}) })
    const walks = [w(48.9116, 2.3338, 'Saint-Ouen-sur-Seine'), w(48.9118, 2.334, 'Saint-Ouen-sur-Seine'), w(48.9115, 2.3335, 'Paris'), w(48.632, -2.17, 'Saint-Briac-sur-Mer'), w(48.6321, -2.1702, 'Saint-Briac-sur-Mer'), w(45.76, 4.83, 'Lyon')]
    const homes = homeSuggestions(walks)
    expect(homes.map((h) => h.name)).toEqual(['Saint-Ouen-sur-Seine', 'Saint-Briac-sur-Mer'])
    expect(homes[0]!.lat).toBeCloseTo(48.9116, 3)
    expect(homeSuggestions([w(45.76, 4.83)])[0]!.name).toBe('Point de départ 1')
  })

  it('R-116 · la notification au retour', () => {
    expect(autoWalkNotice(walk, 'Billy')).toEqual({ title: 'Balade enregistrée', body: '32\u00a0min, 1,9\u00a0km. C’était avec Billy\u00a0?' })
    expect(autoWalkNotice(walk, ' ').body).toBe('32\u00a0min, 1,9\u00a0km. C’était avec votre chien\u00a0?')
  })
})

describe('R-116 · la carte « Nouveau » de l’accueil', () => {
  it('jamais choisi : visible', () => {
    expect(showAutoWalkCard(undefined, '2026-11-10')).toBe(true)
    expect(showAutoWalkCard({}, '2026-11-10')).toBe(true)
  })

  it('choisi (allumé ou éteint) : plus jamais', () => {
    expect(showAutoWalkCard({ chosen: true }, '2026-11-10')).toBe(false)
  })

  it('« Plus tard » : revient dans 7 jours', () => {
    const once = cardLater(undefined, '2026-11-10')
    expect(once).toEqual({ later: 1, laterOn: '2026-11-10' })
    expect(showAutoWalkCard(once, '2026-11-10')).toBe(false)
    expect(showAutoWalkCard(once, '2026-11-16')).toBe(false)
    expect(showAutoWalkCard(once, '2026-11-17')).toBe(true)
  })

  it('2 « Plus tard » : plus jamais', () => {
    const twice = cardLater(cardLater(undefined, '2026-11-10'), '2026-11-17')
    expect(twice.later).toBe(2)
    expect(showAutoWalkCard(twice, '2026-12-31')).toBe(false)
  })
})
