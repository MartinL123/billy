import { describe, expect, it } from 'vitest'
import type { RoutePoint } from './route'
import type { Track } from './track'
import {
  importNewStreets,
  altitudeProfile,
  cadenceOf,
  daylightMoment,
  directionArrows,
  dogAgeLine,
  markNewStreets,
  maxSpeedKmh,
  missingFigures,
  placeSequence,
  rainText,
  sameRoute,
  samplePoints,
  sheetSplits,
  streetSequence,
  streetsBefore,
  streetsSummary,
  timesBefore,
  timesBeforeText,
  walkFigures,
} from './walkFacts'

const M_PER_DEG = 111_195

/** Un trajet vers le nord, un point toutes les 5 s : des portions [durée en s, vitesse en m/s]. */
function trackOf(parts: [number, number][]): Track {
  const track: Track = { t: [0], lat: [45], lng: [1], v: [0] }
  let s = 0
  let lat = 45
  for (const [dur, speed] of parts) {
    for (let k = 0; k < dur; k += 5) {
      s += 5
      lat += (speed * 5) / M_PER_DEG
      track.t.push(s)
      track.lat.push(lat)
      track.lng.push(1)
      track.v!.push(speed)
    }
  }
  return track
}

/** Une ligne droite vers l’est de `meters` mètres, un point tous les `step` m. */
function line(meters: number, step = 50, lat = 45, lng0 = 1): RoutePoint[] {
  const k = M_PER_DEG * Math.cos((lat * Math.PI) / 180)
  return Array.from({ length: Math.floor(meters / step) + 1 }, (_, i) => [lat, lng0 + (i * step) / k] as RoutePoint)
}

describe('vitesse max et cadence', () => {
  it('la vitesse max est lissée : un saut de GPS d’un point ne compte pas', () => {
    const track = trackOf([[300, 1.2], [60, 2], [300, 1.2]])
    expect(maxSpeedKmh(track)).toBe(7.2)
    const jump = trackOf([[300, 1.2]])
    jump.v![30] = 40
    expect(maxSpeedKmh(jump)).toBeLessThan(25)
  })

  it('rien pour un chien qui n’a pas bougé', () => {
    expect(maxSpeedKmh(trackOf([[300, 0]]))).toBeUndefined()
  })

  it('la cadence : pas par minute en marche, rien si douteuse', () => {
    expect(cadenceOf(3000, 30 * 60)).toBe(100)
    expect(cadenceOf(3000, 30)).toBeUndefined()
    expect(cadenceOf(100000, 600)).toBeUndefined()
    expect(cadenceOf(undefined, 600)).toBeUndefined()
  })

  it('les chiffres gardés : km par km, vitesse max, cadence (arrêts retirés)', () => {
    const track = trackOf([[1000, 1.25], [120, 0], [700, 1.25]])
    const figures = walkFigures({ track, stops: [{ at: 1000, durS: 120, lat: 45, lng: 1 }], steps: 3000 })
    expect(figures.kmSplits).toEqual([800, 920])
    expect(figures.maxSpeed).toBe(4.5)
    expect(figures.cadence).toBe(Math.round(3000 / ((1820 - 120) / 60)))
  })

  it('le rattrapage n’écrit que ce qui manque', () => {
    const track = trackOf([[1000, 1.25]])
    expect(missingFigures({ track, kmSplits: [800], maxSpeed: 4.5 })).toBeUndefined()
    expect(missingFigures({ track, maxSpeed: 9 })).toEqual({ kmSplits: [800] })
  })

  it('la fiche prend le km par km du trajet daté, sinon celui gardé', () => {
    expect(sheetSplits({ kmSplits: [700, 760] })).toEqual([
      { km: 1, seconds: 700 },
      { km: 2, seconds: 760 },
    ])
    expect(sheetSplits({ track: trackOf([[1000, 1.25]]) })[0]).toEqual({ km: 1, seconds: 800 })
  })
})

describe('le moment de la journée', () => {
  const day = (h: number, m = 0) => Date.parse(`2026-10-22T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`)
  const sunrise = day(6, 20)
  const sunset = day(16, 40)
  it('au coucher, au lever, en plein jour, de nuit', () => {
    expect(daylightMoment(day(16, 0), day(16, 30), sunrise, sunset)).toBe('coucher')
    expect(daylightMoment(day(17, 0), day(17, 30), sunrise, sunset)).toBe('coucher')
    expect(daylightMoment(day(6, 0), day(6, 25), sunrise, sunset)).toBe('lever')
    expect(daylightMoment(day(11), day(12), sunrise, sunset)).toBe('jour')
    expect(daylightMoment(day(20), day(20, 30), sunrise, sunset)).toBe('nuit')
    expect(daylightMoment(day(4), undefined, sunrise, sunset)).toBe('nuit')
  })
})

describe('rues et lieux traversés', () => {
  it('un point tous les 100 m, le premier et le dernier compris', () => {
    const pts = samplePoints(line(1000))
    expect(pts.length).toBe(11)
    expect(pts[0]).toEqual(line(1000)[0])
    expect(pts[pts.length - 1]).toEqual(line(1000).at(-1))
  })

  it('60 points au plus : l’écart grandit sur une longue balade', () => {
    expect(samplePoints(line(12000, 200)).length).toBeLessThanOrEqual(60)
  })

  it('les rues dans l’ordre du passage, chacune une fois', () => {
    expect(streetSequence(['Rue des Lilas', 'Rue des Lilas', undefined, 'Allée du Moulin', ' rue des lilas ', 'Place de la Fontaine'])).toEqual(['Rue des Lilas', 'Allée du Moulin', 'Place de la Fontaine'])
  })

  it('les lieux, chacun une fois', () => {
    expect(placeSequence([{ name: 'Parc des Hirondelles', kind: 'parc' }, undefined, { name: 'Parc des Hirondelles', kind: 'parc' }, { name: 'Square du Héron', kind: 'square' }])).toEqual([
      { name: 'Parc des Hirondelles', kind: 'parc' },
      { name: 'Square du Héron', kind: 'square' },
    ])
  })

  it('« nouvelle » : jamais vue dans une balade d’avant (par date de départ)', () => {
    const walks = [
      { id: 'a', date: '2026-10-01', startTime: '2026-10-01T07:00:00Z', streets: [{ name: 'Rue des Lilas' }] },
      { id: 'b', date: '2026-10-10', streets: [{ name: 'Allée du Moulin' }] },
      { id: 'c', date: '2026-10-20', streets: [{ name: 'Rue du Puits' }] },
    ]
    const before = streetsBefore(walks, { id: 'x', date: '2026-10-15' })
    expect(markNewStreets(['Rue des Lilas', 'allée du moulin', 'Rue du Puits'], before)).toEqual([{ name: 'Rue des Lilas' }, { name: 'allée du moulin' }, { name: 'Rue du Puits', new: true }])
    // La balade elle-même ne compte pas.
    expect(streetsBefore(walks, { id: 'a', date: '2026-10-01', startTime: '2026-10-01T07:00:00Z' }).size).toBe(0)
  })

  it('le résumé des rues', () => {
    expect(streetsSummary([{ name: 'A' }, { name: 'B', new: true }, { name: 'C', new: true }])).toBe('3 rues, dont 2 nouvelles')
    expect(streetsSummary([{ name: 'A', new: true }])).toBe('1 nouvelle rue')
    expect(streetsSummary([{ name: 'A' }])).toBe('1 rue')
  })
})

describe('le même trajet', () => {
  it('presque identique : 80 % des points de chacun à moins de 30 m de l’autre', () => {
    const a = line(1000)
    const shifted = line(1000, 40, 45 + 15 / M_PER_DEG)
    expect(sameRoute(a, shifted)).toBe(true)
  })

  it('trop loin, ou un bout seulement en commun : pas le même trajet', () => {
    const a = line(1000)
    expect(sameRoute(a, line(1000, 50, 45 + 80 / M_PER_DEG))).toBe(false)
    expect(sameRoute(a, line(400))).toBe(false)
    expect(sameRoute(line(400), a)).toBe(false)
  })

  it('compte seulement les balades d’avant', () => {
    const pts = line(1000)
    const walks = [
      { id: 'a', date: '2026-10-01', points: pts },
      { id: 'b', date: '2026-10-05', points: pts },
      { id: 'c', date: '2026-10-09', points: line(1000, 50, 45.01) },
      { id: 'd', date: '2026-10-30', points: pts },
    ]
    expect(timesBefore({ id: 'x', date: '2026-10-20', points: pts }, walks)).toBe(2)
    expect(timesBeforeText(2)).toBe('Vous êtes déjà passés ici 2 fois')
    expect(timesBeforeText(1)).toBe('Vous êtes déjà passés ici une fois')
    expect(timesBeforeText(0)).toBeUndefined()
  })
})

describe('la carte et le relief', () => {
  it('les flèches suivent le sens de marche, 8 au plus', () => {
    const east = directionArrows(line(1000))
    expect(east.length).toBe(4)
    expect(east.every((a) => a.deg === 90)).toBe(true)
    const west = directionArrows(line(1000).reverse())
    expect(west[0]!.deg).toBe(270)
    expect(directionArrows(line(20000, 200)).length).toBe(8)
    expect(directionArrows(line(50, 10))).toEqual([])
  })

  it('le profil d’altitude : 60 valeurs au plus, le plus bas et le plus haut', () => {
    const alt = Array.from({ length: 600 }, (_, i) => 50 + (i % 100) / 10)
    const p = altitudeProfile(alt)!
    expect(p.values.length).toBeLessThanOrEqual(61)
    expect(p.min).toBeGreaterThanOrEqual(50)
    expect(p.max).toBeLessThanOrEqual(60)
    expect(altitudeProfile([12])).toBeUndefined()
    expect(altitudeProfile(undefined)).toBeUndefined()
  })
})

describe('le chien ce jour-là', () => {
  it('« Billy avait 5 mois et 9 jours », « Votre chien avait… » sans nom', () => {
    expect(dogAgeLine({ name: 'Billy', birthDate: '2026-05-13' }, '2026-10-22')).toBe('Billy avait 5 mois et 9 jours')
    expect(dogAgeLine({ name: 'Votre chien', unnamed: true, birthDate: '2026-05-13' }, '2026-10-22')).toBe('Votre chien avait 5 mois et 9 jours')
  })
  it('rien sans date de naissance, ou avant sa naissance', () => {
    expect(dogAgeLine({ name: 'Billy', birthDate: '' }, '2026-10-22')).toBeUndefined()
    expect(dogAgeLine({ name: 'Billy', birthDate: '2026-05-13' }, '2026-05-01')).toBeUndefined()
  })
})

describe('textes', () => {
  it('la pluie', () => {
    expect(rainText(0)).toBe('0 mm')
    expect(rainText(0.4)).toBe('0,4 mm')
    expect(rainText(12.3)).toBe('12 mm')
  })
})

describe('« Nouvelles rues » des balades importées (T-109)', () => {
  it('compte les rues nouvelles du lot sans doublon, et rien tant que les rues ne sont pas connues', () => {
    expect(importNewStreets([{}, {}])).toBeUndefined()
    expect(importNewStreets([{ streets: [{ name: 'Rue des Lilas', new: true }, { name: 'Allée Verte' }] }, {}])).toBe(1)
    expect(importNewStreets([{ streets: [{ name: 'Rue des Lilas', new: true }] }, { streets: [{ name: 'rue des lilas', new: true }, { name: 'Quai Bleu', new: true }] }])).toBe(2)
    expect(importNewStreets([{ streets: [] }])).toBe(0)
  })
})
