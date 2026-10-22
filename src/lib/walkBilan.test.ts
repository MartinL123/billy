import { describe, expect, it } from 'vitest'
import { bilanStats, monthReport, monthStats, topMomentLine, walkPhotos } from './walkBilan'
import type { RouteMoment, RoutePoint } from './route'

const line = (lat0: number, n = 10): RoutePoint[] => Array.from({ length: n }, (_, i) => [lat0 + i * 0.0005, 2.35])
const m = (type: RouteMoment['type']): RouteMoment => ({ lat: 48.85, lng: 2.35, type })
const walk = (id: string, date: string, points: RoutePoint[], extra: Partial<{ distanceM: number; durationMin: number; moments: RouteMoment[]; stops: { at: number; durS: number; lat: number; lng: number; momentIndex?: number }[] }> = {}) => ({
  id,
  date,
  route: { points, distanceM: extra.distanceM ?? 1000, moments: extra.moments ?? [], ...(extra.durationMin ? { durationMin: extra.durationMin } : {}), ...(extra.stops ? { stops: extra.stops } : {}) },
})

describe('bilanStats', () => {
  it('balades · km · temps de balade (V6.1 : plus de pourcentage, « de balade » et non « ensemble »)', () => {
    const walks = [walk('a', '2026-10-01', line(48.85), { distanceM: 2100, durationMin: 45 }), walk('b', '2026-09-01', line(48.86), { distanceM: 3000, durationMin: 95 })]
    const nb = (t: string) => t.replace(/\u00a0/g, ' ')
    expect(bilanStats(walks).map((s) => `${nb(s.value)} ${s.label}`)).toEqual(['2 Balades', '5,1 km Distance', '2 h 20 De balade'])
  })

  it('sans durée : cette case reste vide (le composant Stats la cache)', () => {
    const stats = bilanStats([walk('a', '2026-10-01', line(48.85))])
    expect(stats[0]).toEqual({ value: '1', label: 'Balade' })
    expect(stats[2]!.value).toBe('')
  })
})

describe('walkPhotos', () => {
  it('les photos des balades seulement, des plus récentes aux plus anciennes, sans doublon', () => {
    const p = (id: string) => ({ fileId: id, thumbFileId: `t-${id}` })
    const entries = [
      { date: '2026-10-01', photos: [p('1'), p('2')], route: { points: [{}, {}] } },
      { date: '2026-10-05', photos: [p('3'), p('1')], route: { points: [{}, {}] } },
      { date: '2026-10-07', photos: [p('4')] }, // un souvenir sans trajet
    ]
    expect(walkPhotos(entries).map((x) => x.fileId)).toEqual(['3', '1', '2'])
  })
})

describe('monthReport', () => {
  it('compte ce qui s’ajoute ce mois-ci : balades, km, cases nouvelles, arrêts racontés, moment le plus noté', () => {
    const walks = [
      walk('old', '2026-09-20', line(48.85)),
      // Même trajet qu’en septembre : rien de nouveau.
      walk('same', '2026-10-02', line(48.85), { distanceM: 500, moments: [m('jeu'), m('peur'), m('peur'), m('peur')], stops: [{ at: 60, durS: 40, lat: 48.85, lng: 2.35, momentIndex: 0 }, { at: 200, durS: 40, lat: 48.85, lng: 2.35 }] }),
      walk('new', '2026-10-10', line(48.9), { distanceM: 1500, moments: [m('jeu'), m('rencontre'), m('note')], stops: [{ at: 60, durS: 40, lat: 48.9, lng: 2.35, momentIndex: 1 }] }),
      walk('next', '2026-11-01', line(48.95)),
    ]
    const r = monthReport(walks, '2026-10')
    expect(r.walks).toBe(2)
    expect(r.distanceM).toBe(2000)
    expect(r.toldStops).toBe(2)
    // Le stress ne compte pas (seulement ce qui monte), les notes non plus.
    expect(r.topMoment).toBe('jeu')
    const fresh = monthReport([walks[2]!], '2026-10').newCells
    expect(fresh).toBeGreaterThan(0)
    expect(r.newCells).toBe(fresh)
  })

  it('un mois sans balade : tout à zéro, aucune Stat affichée', () => {
    const r = monthReport([walk('a', '2026-09-01', line(48.85))], '2026-10')
    expect(r).toEqual({ walks: 0, distanceM: 0, newCells: 0, toldStops: 0 })
    expect(monthStats(r).every((s) => s.value === '')).toBe(true)
    expect(topMomentLine(r.topMoment)).toBeUndefined()
  })

  it('les Stats du mois et la phrase du moment', () => {
    expect(monthStats({ walks: 3, distanceM: 4200, newCells: 85, toldStops: 1 })).toEqual([
      { value: '3', label: 'Balades' },
      { value: '4,2 km', label: 'Distance' },
      { value: '1', label: 'Arrêt raconté' },
    ])
    expect(topMomentLine('rencontre')).toBe('Le moment le plus noté : rencontre chien.')
  })
})
