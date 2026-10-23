import { describe, expect, it } from 'vitest'
import type { RoutePoint } from './route'
import type { WalkBudget } from './walkBudget'
import type { WalkItem } from './walkList'
import { DEFAULT_TARGET, pickRecos, recoTarget, recoWeather } from './walkRecos'

// Des balades inventées, autour d’un point inventé (0,001° de latitude ≈ 110 m).
const HOME = { lat: 45.5, lng: 4.2 }
const TODAY = '2026-10-23'
const walk = (id: string, minutes: number, { north = 0, date = '2026-09-01' }: { north?: number; date?: string } = {}): WalkItem => {
  const from = { lat: HOME.lat + north * 0.001, lng: HOME.lng }
  const points: RoutePoint[] = [0, 1, 2, 3].map((i) => [from.lat, from.lng + i * 0.001])
  return { id, date, name: `Balade ${id}`, route: { points, distanceM: minutes * 75, durationMin: minutes, moments: [] } }
}
const budget = (next: number, perWalk = 25): WalkBudget => ({ months: 5, perWalk, daily: perWalk * 3, walked: 0, next })
const ids = (list: { item: WalkItem }[]) => list.map((r) => r.item.id)

describe('T-118 : la durée visée', () => {
  it('la durée conseillée de la prochaine sortie (ce qui reste du jour, réparti)', () => {
    expect(recoTarget(budget(20))).toBe(20)
  })
  it('le temps du jour déjà fait : la durée prévue d’une sortie ; sans règle : une demi-heure', () => {
    expect(recoTarget(budget(0, 25))).toBe(25)
    expect(recoTarget(undefined)).toBe(DEFAULT_TARGET)
  })
})

describe('T-118 : la météo de l’heure qui vient', () => {
  it('pluie, chaud, froid, beau, sinon normal', () => {
    expect(recoWeather({ tempC: 15, rainMm: 0.6 })).toBe('pluie')
    expect(recoWeather({ tempC: 15, rainMm: 0, rainProb: 70 })).toBe('pluie')
    expect(recoWeather({ tempC: 29, rainMm: 0 })).toBe('chaud')
    expect(recoWeather({ tempC: -2, rainMm: 0 })).toBe('froid')
    expect(recoWeather({ tempC: 18, rainMm: 0, rainProb: 10 })).toBe('beau')
    expect(recoWeather({ tempC: 8, rainMm: 0 })).toBe('normal')
    expect(recoWeather(undefined)).toBeUndefined()
  })
})

describe('T-118 : 3 idées de balade', () => {
  // Des coins différents (≈ 550 m d’écart entre chaque).
  const walks = [walk('a', 10, { north: 0 }), walk('b', 18, { north: 5 }), walk('c', 25, { north: 10 }), walk('d', 32, { north: 15 }), walk('e', 45, { north: 20 }), walk('f', 70, { north: 25 })]

  it('les 3 dont la durée colle le mieux, de la plus courte à la plus longue ; sans météo, pas de phrase', () => {
    const recos = pickRecos(walks, { target: 25, today: TODAY })
    expect(ids(recos)).toEqual(['b', 'c', 'd'])
    expect(recos.every((r) => r.hint === undefined)).toBe(true)
    expect(recos.map((r) => r.minutes)).toEqual([18, 25, 32])
  })

  it('pluie prévue : des plus courtes, et pourquoi', () => {
    const recos = pickRecos(walks, { target: 25, today: TODAY, weather: { tempC: 11, rainMm: 1.2 } })
    expect(ids(recos)).toEqual(['a', 'b', 'c'])
    expect(recos[0]!.hint).toBe('Pluie prévue : une courte')
  })

  it('chaleur : plus courtes aussi, jamais plus longues que la durée visée si on peut', () => {
    const recos = pickRecos(walks, { target: 25, today: TODAY, weather: { tempC: 31, rainMm: 0 } })
    expect(recos.every((r) => r.minutes <= 25)).toBe(true)
    expect(recos[0]!.hint).toBe('Il fait chaud : une courte')
  })

  it('beau temps : une des trois peut être plus longue (jusqu’à 1,5 fois)', () => {
    const recos = pickRecos(walks, { target: 25, today: TODAY, weather: { tempC: 18, rainMm: 0, rainProb: 5 } })
    expect(recos).toHaveLength(3)
    const long = recos.find((r) => r.longer)!
    expect(long.minutes).toBeGreaterThan(25)
    expect(long.minutes).toBeLessThanOrEqual(37.5)
    expect(long.hint).toBe('Beau temps : une plus longue')
    expect(recos.filter((r) => !r.longer).every((r) => r.hint === '18 °C, beau temps')).toBe(true)
  })

  it('de la variété : pas deux départs au même endroit, sauf faute de mieux', () => {
    const same = [walk('x1', 24, { north: 0 }), walk('x2', 25, { north: 1 }), walk('x3', 26, { north: 2 }), walk('y', 15, { north: 30 })]
    const recos = pickRecos(same, { target: 25, today: TODAY })
    expect(ids(recos)).toContain('y')
    expect(recos).toHaveLength(3)
  })

  it('pas refaite tout récemment : à durée égale, l’autre passe devant', () => {
    const recent = [walk('hier', 25, { north: 0, date: '2026-10-22' }), walk('ancienne', 25, { north: 10, date: '2026-08-01' })]
    expect(ids(pickRecos(recent, { target: 25, today: TODAY }))[0]).toBe('ancienne')
    const one = pickRecos([walk('hier', 25, { date: '2026-10-22' }), walk('loin', 40, { north: 10 })], { target: 25, today: TODAY })
    expect(ids(one)).toEqual(['hier', 'loin'])
  })

  it('aucune balade avec un tracé : aucune idée', () => {
    expect(pickRecos([], { target: 25, today: TODAY })).toEqual([])
    const dot: WalkItem = { id: 'p', date: TODAY, name: 'Point', route: { points: [[45.5, 4.2]], distanceM: 0, durationMin: 20, moments: [] } }
    expect(pickRecos([dot], { target: 25, today: TODAY })).toEqual([])
  })
})
