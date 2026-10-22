import { describe, expect, it } from 'vitest'
import { communeAt, communeFromNominatim, isCommuneSized } from './commune'
import { discoveredShare, inPolygon, revealedCells } from './fog'

// Réponse inventée au format de Nominatim (aucun vrai lieu de Martin).
const RESPONSE = {
  osm_type: 'relation',
  osm_id: 42,
  name: 'Bourg-en-Test',
  address: { village: 'Bourg-en-Test', county: 'Test' },
  geojson: {
    type: 'MultiPolygon',
    coordinates: [
      [[[2, 47], [2.01, 47], [2.01, 47.01], [2, 47.01], [2, 47]]],
      [[[2.2, 47], [2.201, 47], [2.201, 47.001], [2.2, 47]]],
    ],
  },
}

describe('commune', () => {
  it('garde le plus grand contour, sa surface et son cadre', () => {
    const commune = communeFromNominatim(RESPONSE)!
    expect(commune.id).toBe('relation42')
    expect(commune.name).toBe('Bourg-en-Test')
    expect(commune.bbox).toEqual([47, 2, 47.01, 2.01])
    // 0,01° × 0,01° à 47° de latitude : environ 1,11 km × 0,76 km.
    expect(commune.areaM2).toBeGreaterThan(0.8e6)
    expect(commune.areaM2).toBeLessThan(0.9e6)
    expect(commune.ring.every((p) => typeof p.lat === 'number')).toBe(true)
    expect(communeAt([commune], { lat: 47.005, lng: 2.005 }, inPolygon)?.name).toBe('Bourg-en-Test')
    expect(communeAt([commune], { lat: 47.5, lng: 2.005 }, inPolygon)).toBeUndefined()
  })

  it('rien sans surface', () => {
    expect(communeFromNominatim({ osm_id: 1, geojson: { type: 'Point', coordinates: [2, 47] } })).toBeUndefined()
    expect(communeFromNominatim(null)).toBeUndefined()
  })

  // R-086 : en mer, Nominatim répond le pays. Tout est inventé (pays et ville fictifs).
  const square = (w: number, s: number, e: number, n: number) => [[[w, s], [e, s], [e, n], [w, n], [w, s]]]
  const COUNTRY = { osm_type: 'relation', osm_id: 7, addresstype: 'country', name: 'Pays-de-Test', address: { country: 'Pays-de-Test' }, geojson: { type: 'Polygon', coordinates: square(-4, 42, 8, 51) } }
  const CITY = { osm_type: 'relation', osm_id: 8, addresstype: 'town', name: 'Villetest', address: { town: 'Villetest' }, geojson: { type: 'Polygon', coordinates: square(2, 47, 2.05, 47.04) } }

  it('un point en mer (le pays répond) ne crée aucune commune', () => {
    expect(communeFromNominatim(COUNTRY)).toBeUndefined()
    // Sans addresstype (anciennes réponses), la surface suffit à refuser.
    expect(communeFromNominatim({ ...COUNTRY, addresstype: undefined, address: { village: 'Pays-de-Test' } })).toBeUndefined()
    expect(communeFromNominatim({ ...CITY, addresstype: 'state' })).toBeUndefined()
    expect(communeFromNominatim(CITY)?.name).toBe('Villetest')
  })

  it('la plus petite commune qui contient le point, jamais un pays gardé avant R-086', () => {
    const city = communeFromNominatim(CITY)!
    const country = { id: 'r7', name: 'Pays-de-Test', areaM2: 640_000e6, bbox: [42, -4, 51, 8] as [number, number, number, number], ring: square(-4, 42, 8, 51)[0]!.map(([lng, lat]) => ({ lat: lat!, lng: lng! })) }
    expect(isCommuneSized(country)).toBe(false)
    expect(isCommuneSized(city)).toBe(true)
    const p = { lat: 47.02, lng: 2.02 }
    expect(communeAt([country, city], p, inPolygon)?.name).toBe('Villetest')
    // Seul le pays connu : rien plutôt que « < 1 % » de tout un pays.
    expect(communeAt([country], p, inPolygon)).toBeUndefined()
    // Deux vraies communes emboîtées (cadres qui se chevauchent) : la plus petite.
    const big = { ...city, name: 'Grandeville', areaM2: city.areaM2 * 4 }
    expect(communeAt([big, city], p, inPolygon)?.name).toBe('Villetest')
  })

  it('un point en ville : la part découverte de <ville> (donnée du brouillard)', () => {
    const city = communeFromNominatim(CITY)!
    const country = { id: 'r7', name: 'Pays-de-Test', areaM2: 640_000e6, bbox: [42, -4, 51, 8] as [number, number, number, number], ring: square(-4, 42, 8, 51)[0]!.map(([lng, lat]) => ({ lat: lat!, lng: lng! })) }
    const points = Array.from({ length: 40 }, (_, i) => ({ lat: 47.005 + i * 0.0008, lng: 2.025 }))
    const commune = communeAt([country, city], points[0]!, inPolygon)!
    const share = discoveredShare([...revealedCells(points)], commune)
    expect(share).toBeGreaterThanOrEqual(0.01)
  })
})
