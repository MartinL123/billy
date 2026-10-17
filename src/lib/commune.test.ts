import { describe, expect, it } from 'vitest'
import { communeAt, communeFromNominatim } from './commune'
import { inPolygon } from './fog'

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
})
