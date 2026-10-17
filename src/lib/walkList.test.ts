import { describe, expect, it } from 'vitest'
import { communesOf, filterWalks, walkItems, walksSummary, walkTags } from './walkList'
import { storeRoute } from './route'

const route = (distanceM: number, durationMin: number, fear = false) => storeRoute({ points: [[47, 2], [47.01, 2]], distanceM, durationMin, moments: fear ? [{ lat: 47, lng: 2, type: 'peur' }] : [] })

describe('toutes les balades', () => {
  const items = walkItems([
    { id: 'a', date: '2026-10-17', text: 'Balade du matin', route: route(1400, 24) },
    { id: 'b', date: '2026-09-30', text: 'Grande boucle', route: route(4200, 70, true) },
    { id: 'c', date: '2026-10-02', text: 'Une photo', route: undefined },
  ])
  it('seulement les moments avec un trajet, les plus récents d’abord', () => {
    expect(items.map((w) => w.id)).toEqual(['a', 'b'])
  })
  it('filtres', () => {
    expect(filterWalks(items, 'mois', '2026-10-17').map((w) => w.id)).toEqual(['a'])
    expect(filterWalks(items, 'peur', '2026-10-17').map((w) => w.id)).toEqual(['b'])
    expect(filterWalks(items, 'long', '2026-10-17').map((w) => w.id)).toEqual(['b'])
    expect(filterWalks(items, 'toutes', '2026-10-17')).toHaveLength(2)
  })
  it('résumé', () => {
    expect(walksSummary(items)).toBe('2 balades · 5,6 km · 1 h 34 ensemble')
  })
  it('communes et étiquettes', () => {
    const withTowns = walkItems([
      { id: 'a', date: '2026-10-17', text: 'A', route: route(1400, 24), source: 'strava', commune: 'Bourg' },
      { id: 'b', date: '2026-10-16', text: 'B', route: route(900, 15, true), commune: 'Ville' },
      { id: 'c', date: '2026-10-15', text: 'C', route: route(900, 15), commune: 'Bourg' },
    ])
    expect(communesOf(withTowns)).toEqual(['Bourg', 'Ville'])
    expect(filterWalks(withTowns, 'commune:Ville', '2026-10-17').map((w) => w.id)).toEqual(['b'])
    expect(walkTags(withTowns[0]!)).toEqual(['Strava'])
    expect(walkTags(withTowns[1]!)).toEqual(['Tracé à la main', '1 peur'])
  })
})

