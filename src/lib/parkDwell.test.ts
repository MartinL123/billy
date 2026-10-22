import { describe, expect, it } from 'vitest'
import { cachedParks, canOfferPark, dwellStep, MAX_ZONES, NO_DWELL, parkAt, parkOfferOn, parkOfferText, parksQuery, parseParks, PARKS_WEEK_MS, storeParks, type ParkArea } from './parkDwell'

// Lieux inventés (le dépôt est public).
const square: ParkArea = { name: 'Square des Tilleuls', kind: 'parc', s: 48.8, w: 2.3, n: 48.801, e: 2.301 }
const grand: ParkArea = { name: 'Parc du Moulin Bleu', kind: 'parc', s: 48.79, w: 2.29, n: 48.81, e: 2.31 }
const inSquare = { lat: 48.8005, lng: 2.3005 }
const inGrand = { lat: 48.795, lng: 2.295 }
const outside = { lat: 48.9, lng: 2.4 }

describe('exercice au parc (T-101)', () => {
  it('la requête Overpass : parcs, parcs canins et jardins à 2 km', () => {
    expect(parksQuery(48.8, 2.3)).toContain('leisure~"^(park|dog_park|garden)$"](around:2000,48.80000,2.30000)')
  })

  it('lit les parcs, écarte les jardins privés', () => {
    const parks = parseParks({
      elements: [
        { type: 'way', tags: { leisure: 'park', name: 'Square des Tilleuls' }, bounds: { minlat: 48.8, minlon: 2.3, maxlat: 48.801, maxlon: 2.301 } },
        { type: 'node', lat: 48.8, lon: 2.3, tags: { leisure: 'dog_park' } },
        { type: 'way', tags: { leisure: 'garden', name: 'Jardin de la résidence', access: 'private' }, bounds: { minlat: 1, minlon: 1, maxlat: 2, maxlon: 2 } },
        { type: 'way', tags: { leisure: 'garden' }, bounds: { minlat: 1, minlon: 1, maxlat: 2, maxlon: 2 } },
        { type: 'way', tags: { leisure: 'pitch', name: 'Stade' }, bounds: { minlat: 1, minlon: 1, maxlat: 2, maxlon: 2 } },
      ],
    })
    expect(parks).toEqual([
      { name: 'Square des Tilleuls', kind: 'parc', s: 48.8, w: 2.3, n: 48.801, e: 2.301 },
      { name: '', kind: 'canin', s: 48.7998, w: 2.2998, n: 48.8002, e: 2.3002 },
    ])
    expect(parseParks(null)).toEqual([])
  })

  it('le plus petit parc qui contient le point', () => {
    expect(parkAt(inSquare, [grand, square])).toBe(square)
    expect(parkAt(inGrand, [grand, square])).toBe(grand)
    expect(parkAt(outside, [grand, square])).toBeUndefined()
  })

  it('propose après 30 s dans le même parc, une seule fois par balade', () => {
    let s = dwellStep(NO_DWELL, 0, [square], inSquare)
    expect(s.offer).toBeUndefined()
    s = dwellStep(s.state, 20_000, [square], inSquare)
    expect(s.offer).toBeUndefined()
    // L’iPhone immobile n’envoie plus de position : l’horloge suffit.
    s = dwellStep(s.state, 30_000, [square])
    expect(s.offer).toBe(square)
    // Une fois proposé : plus jamais pendant cette balade.
    s = dwellStep(s.state, 60_000, [square], outside)
    s = dwellStep(s.state, 70_000, [square], inSquare)
    expect(dwellStep(s.state, 200_000, [square], inSquare).offer).toBeUndefined()
  })

  it('sortir du parc avant 30 s remet à zéro', () => {
    let s = dwellStep(NO_DWELL, 0, [square], inSquare)
    s = dwellStep(s.state, 25_000, [square], outside)
    s = dwellStep(s.state, 26_000, [square], inSquare)
    expect(dwellStep(s.state, 50_000, [square]).offer).toBeUndefined()
    expect(dwellStep(s.state, 56_000, [square]).offer).toBe(square)
    // Passer d’un parc à l’autre recommence aussi.
    let t = dwellStep(NO_DWELL, 0, [square, grand], inGrand)
    t = dwellStep(t.state, 20_000, [square, grand], inSquare)
    expect(dwellStep(t.state, 35_000, [square, grand]).offer).toBeUndefined()
  })

  it('le texte, jamais de reproche', () => {
    expect(parkOfferText(square, 'Assis', 3)).toBe('Vous êtes au square des Tilleuls. 3 min de « Assis » ici ?')
    expect(parkOfferText({ name: '', kind: 'canin' }, 'Assis', 3)).toBe('Vous êtes dans un parc canin. 3 min de « Assis » ici ?')
  })

  it('seulement si la mission du jour est à faire et le réglage allumé (par défaut)', () => {
    expect(canOfferPark({ enabled: true, done: false, rest: false })).toBe(true)
    expect(canOfferPark({ enabled: true, done: true, rest: false })).toBe(false)
    expect(canOfferPark({ enabled: true, done: false, rest: true })).toBe(false)
    expect(canOfferPark({ enabled: false, done: false, rest: false })).toBe(false)
    expect(parkOfferOn(undefined)).toBe(true)
    expect(parkOfferOn({ parc: false })).toBe(false)
  })

  it('le cache : 7 jours, 5 zones au plus', () => {
    let cache = storeParks({}, 'a', [square], 0)
    expect(cachedParks(cache, 'a', PARKS_WEEK_MS - 1)).toEqual([square])
    expect(cachedParks(cache, 'a', PARKS_WEEK_MS)).toBeUndefined()
    for (let i = 1; i <= 6; i++) cache = storeParks(cache, `z${i}`, [], i)
    expect(Object.keys(cache)).toHaveLength(MAX_ZONES)
    expect(cache.a).toBeUndefined()
  })
})
