import { describe, expect, it } from 'vitest'
import { arrowTo, directionsUrl, metersLabel, overpassQuery, parseOverpass, rankIdeas } from './ideas'
import { cellOf } from './fog'

// Réponse Overpass inventée (aucun vrai lieu de Martin).
const RESPONSE = {
  elements: [
    { type: 'node', id: 1, lat: 47.01, lon: 2, tags: { tourism: 'viewpoint', name: 'Pointe du Test' } },
    { type: 'way', id: 2, center: { lat: 47.004, lon: 2.001 }, tags: { natural: 'beach', name: 'Plage du Test', dog: 'no' } },
    { type: 'way', id: 3, center: { lat: 47.002, lon: 2 }, tags: { leisure: 'park', name: 'Square du Bourg' } },
    { type: 'node', id: 4, lat: 47.0005, lon: 2.0005, tags: { amenity: 'drinking_water' } },
    { type: 'way', id: 5, center: { lat: 47.0, lon: 2.0 }, tags: { leisure: 'park' } },
    { type: 'way', id: 6, tags: { highway: 'primary' }, geometry: [ { lat: 47.002, lon: 1.999 }, { lat: 47.002, lon: 2.001 } ] },
  ],
}

describe('à découvrir', () => {
  const { places, roads } = parseOverpass(RESPONSE)
  const here = { lat: 47, lng: 2 }

  it('lit les lieux nommés et les grandes routes', () => {
    expect(places.map((p) => p.name)).toEqual(['Pointe du Test', 'Plage du Test', 'Square du Bourg', 'Point d’eau'])
    expect(places[1]!.dogsBanned).toBe(true)
    expect(roads).toHaveLength(1)
    expect(overpassQuery(47, 2)).toContain('around:2000,47.00000,2.00000')
    expect(overpassQuery(47, 2)).not.toContain('highway')
    expect(overpassQuery(47, 2, { roads: true })).toContain('highway')
  })

  it('d’abord les lieux jamais explorés', () => {
    const cells = new Set([cellOf({ lat: 47.0005, lng: 2.0005 })])
    const ideas = rankIdeas(places, { here, cells, roads, profile: { sensitive: false, sporty: false, short: false } })
    expect(ideas[ideas.length - 1]!.name).toBe('Point d’eau')
    expect(ideas[ideas.length - 1]!.explored).toBe(true)
    // Puis le plus proche des lieux de balade.
    expect(ideas[0]!.name).toBe('Square du Bourg')
  })

  it('chien sensible : lieux naturels loin des grandes routes d’abord', () => {
    const ideas = rankIdeas(places, { here, cells: new Set(), roads, profile: { sensitive: true, sporty: false, short: false } })
    // Le square est à 0 m de la grande route : il passe après la plage et la pointe.
    expect(ideas[0]!.name).toBe('Plage du Test')
    expect(ideas[0]!.reason).toBe('Plage loin des voitures, au calme pour lui.')
    expect(ideas.findIndex((i) => i.name === 'Square du Bourg')).toBeGreaterThan(1)
  })

  it('6 idées au plus, petites aides', () => {
    expect(rankIdeas([...places, ...places, ...places], { here, cells: new Set(), roads, profile: { sensitive: false, sporty: false, short: false } })).toHaveLength(6)
    expect(metersLabel(712)).toBe('700 m')
    expect(metersLabel(1400)).toBe('1,4 km')
    expect(directionsUrl(47, 2)).toBe('https://maps.apple.com/?daddr=47.00000,2.00000&dirflg=w')
    expect(arrowTo(here, { lat: 47.01, lng: 2.01 })).toBe('↗')
    expect(arrowTo(here, { lat: 46.99, lng: 2 })).toBe('↓')
  })
})
