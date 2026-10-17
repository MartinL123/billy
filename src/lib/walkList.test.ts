import { describe, expect, it } from 'vitest'
import { filterWalks, walkItems, walksSummary } from './walkList'
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
})
