import { describe, expect, it } from 'vitest'
import type { Track } from './track'
import { longestWalkWithoutStop, parcoursRows, photoPins, walkNumber } from './walkFiche'

const walk = (id: string, date: string, startTime?: string) => ({ id, date, ...(startTime ? { startTime } : {}) })

describe('walkNumber : « Balade n° X avec Billy »', () => {
  const walks = [walk('a', '2026-05-01', '2026-05-01T08:00:00Z'), walk('b', '2026-06-01', '2026-06-01T08:00:00Z'), walk('c', '2026-06-01', '2026-06-01T18:00:00Z'), walk('d', '2026-07-10')]
  it('compte les balades depuis l’adoption, par heure de départ', () => {
    expect(walkNumber(walks, walks[1]!, '2026-05-20')).toBe(1)
    expect(walkNumber(walks, walks[2]!, '2026-05-20')).toBe(2)
    expect(walkNumber(walks, walks[3]!, '2026-05-20')).toBe(3)
  })
  it('le jour de l’adoption compte', () => {
    expect(walkNumber(walks, walks[1]!, '2026-06-01')).toBe(1)
  })
  it('sans date d’adoption (ou vide) : parmi toutes les balades', () => {
    expect(walkNumber(walks, walks[3]!, '')).toBe(4)
    expect(walkNumber(walks, walks[0]!)).toBe(1)
  })
  it('une balade d’avant l’adoption n’a pas de numéro', () => {
    expect(walkNumber(walks, walks[0]!, '2026-05-20')).toBeUndefined()
  })
  it('l’ordre ne dépend pas de l’ordre de la liste, ni d’une balade importée plus tard', () => {
    expect(walkNumber([...walks].reverse(), walks[2]!, '2026-05-20')).toBe(2)
  })
})

describe('longestWalkWithoutStop : « Sans pause »', () => {
  const track: Track = { t: [0, 600, 1200, 1800], lat: [48.85, 48.851, 48.852, 48.853], lng: [2.35, 2.35, 2.35, 2.35] }
  it('la plus longue marche entre le départ, les arrêts et l’arrivée', () => {
    // 0–300 marche, 300–480 arrêt, 480–1020 marche (9 min), 1020–1080 arrêt, 1080–1800 marche (12 min)
    expect(longestWalkWithoutStop({ track, stops: [{ at: 300, durS: 180, lat: 0, lng: 0 }, { at: 1020, durS: 60, lat: 0, lng: 0 }] })).toBe(720)
    expect(longestWalkWithoutStop({ track, stops: [{ at: 1020, durS: 60, lat: 0, lng: 0 }, { at: 300, durS: 1200, lat: 0, lng: 0 }] })).toBe(300)
  })
  it('sans arrêt : toute la balade', () => {
    expect(longestWalkWithoutStop({ track, stops: [] })).toBe(1800)
  })
  it('recadrée : sur la portion gardée', () => {
    expect(longestWalkWithoutStop({ track, trimmed: { startS: 600, endS: 1200 }, stops: [{ at: 900, durS: 60, lat: 0, lng: 0 }] })).toBe(300)
  })
  it('rien sans trajet daté ou sans arrêts calculés', () => {
    expect(longestWalkWithoutStop({ stops: [] })).toBeUndefined()
    expect(longestWalkWithoutStop({ track })).toBeUndefined()
  })
})

describe('parcoursRows : « Le parcours »', () => {
  it('les rues (nouvelle en vert), puis les parcs (parc en gris), sans doublon', () => {
    expect(
      parcoursRows(
        [{ name: 'Boulevard des Ormes' }, { name: 'Rue des Lilas', new: true }],
        [
          { name: 'Square des Tilleuls', kind: 'square' },
          { name: 'rue des lilas', kind: 'lieu' },
          { name: 'Place du Marché', kind: 'lieu' },
        ],
      ),
    ).toEqual([{ name: 'Boulevard des Ormes' }, { name: 'Rue des Lilas', tag: 'nouvelle' }, { name: 'Square des Tilleuls', tag: 'parc' }, { name: 'Place du Marché' }])
  })
})

describe('photoPins : les photos sur la carte', () => {
  const route = { points: [[48.85, 2.35], [48.86, 2.35]] as [number, number][], startTime: '2026-10-22T06:00:00Z', durationMin: 20 }
  it('à la position gardée, sinon à l’heure recoupée avec le tracé, sinon pas sur la carte', () => {
    const pins = photoPins(
      [
        { thumbFileId: 't0', lat: 48.851, lng: 2.351 },
        { thumbFileId: 't1', time: '2026-10-22T06:10:00Z' },
        { thumbFileId: 't2' },
        { thumbFileId: 't3', time: '2026-10-23T06:10:00Z' },
      ],
      route,
    )
    expect(pins.map((p) => p.index)).toEqual([0, 1])
    expect(pins[0]).toEqual({ index: 0, thumbFileId: 't0', lat: 48.851, lng: 2.351 })
    expect(pins[1]!.lat).toBeCloseTo(48.855, 3)
  })
})
