import { describe, expect, it } from 'vitest'
import { communesOf, filterWalks, walkColors, WALK_COLORS, walkItems, walksSummary, walkTags } from './walkList'
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


describe('une couleur par balade', () => {
  it('suit l’ordre chronologique : une nouvelle balade ne change pas les couleurs des anciennes', () => {
    const before = walkItems([
      { id: 'a', date: '2026-10-01', text: 'A', route: route(1000, 10) },
      { id: 'b', date: '2026-10-05', text: 'B', route: route(1000, 10) },
    ])
    const after = walkItems([...before.map((w) => ({ id: w.id, date: w.date, text: w.name, route: route(1000, 10) })), { id: 'c', date: '2026-10-09', text: 'C', route: route(1000, 10) }])
    expect(walkColors(before).get('a')).toBe(WALK_COLORS[0])
    expect(walkColors(after).get('a')).toBe(walkColors(before).get('a'))
    expect(walkColors(after).get('b')).toBe(walkColors(before).get('b'))
    expect(walkColors(after).get('c')).toBe(WALK_COLORS[2])
  })
})
