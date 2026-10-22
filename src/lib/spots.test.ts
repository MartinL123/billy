import { describe, expect, it } from 'vitest'
import { calmSummary } from './community'
import type { RoutePoint } from './route'
import { distanceToRoutes, dogsThisWeek, duplicateCandidates, goLabel, newSpotCheck, spotPills, spotStats, spotTips, walkingMinutes } from './spots'

// Un trajet est-ouest à Paris ; 0,0001° de latitude ≈ 11 m.
const route: RoutePoint[] = [
  [48.8566, 2.35],
  [48.8566, 2.36],
]
const north = (m: number) => ({ lat: 48.8566 + m / 111_200, lng: 2.355 })

describe('les spots façon Highlight (V6 § 8.1)', () => {
  it('mesure la distance au trajet le plus proche', () => {
    expect(distanceToRoutes(north(30), [route])).toBeGreaterThan(28)
    expect(distanceToRoutes(north(30), [route])).toBeLessThan(32)
    expect(distanceToRoutes(north(30), [])).toBe(Infinity)
    // Le plus proche des deux trajets.
    expect(distanceToRoutes(north(30), [[[48.9, 2.3], [48.9, 2.31]], route])).toBeLessThan(32)
  })

  it('crée un spot seulement à moins de 60 m d’un trajet déjà fait', () => {
    expect(newSpotCheck(north(55), [route], [])).toEqual({ kind: 'ok' })
    expect(newSpotCheck(north(70), [route], [])).toEqual({ kind: 'loin' })
    // Sans aucune balade : jamais.
    expect(newSpotCheck(north(0), [], [])).toEqual({ kind: 'loin' })
  })

  it('propose d’abord les spots à moins de 100 m, du plus proche au plus loin', () => {
    const here = north(20)
    const spots = [
      { id: 'loin', ...north(150) },
      { id: 'pres', ...north(30) },
      { id: 'moyen', ...north(110) },
    ]
    const check = newSpotCheck(here, [route], spots)
    expect(check.kind).toBe('doublons')
    expect(check.kind === 'doublons' && check.candidates.map((s) => s.id)).toEqual(['pres', 'moyen'])
    expect(duplicateCandidates(spots, north(300))).toEqual([])
  })

  it('dit le temps à pied : « Y aller · 8 min à pied »', () => {
    expect(walkingMinutes(600)).toBe(8)
    expect(walkingMinutes(10)).toBe(1)
    expect(goLabel(600)).toBe('Y aller · 8 min à pied')
    expect(goLabel(undefined)).toBe('Y aller')
  })

  it('compte chaque chien une fois dans la semaine', () => {
    const week = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22']
    const marks = [
      { spotId: 'a', uid: 'u1', date: '2026-10-19' },
      { spotId: 'a', uid: 'u1', date: '2026-10-21' },
      { spotId: 'a', uid: 'u2', date: '2026-10-22' },
      { spotId: 'a', uid: 'u3', date: '2026-10-10' },
      { spotId: 'b', uid: 'u4', date: '2026-10-22' },
    ]
    expect(dogsThisWeek(marks, 'a', week)).toBe(2)
  })

  it('montre les Stats : calme et moment · chiens cette semaine · distance', () => {
    const votes = [
      { level: 'calme' as const, slot: 'tot' as const },
      { level: 'calme' as const, slot: 'tot' as const },
      { level: 'anime' as const, slot: 'soir' as const },
    ]
    expect(spotStats({ votes, dogs: 3, meters: 640 })).toEqual([
      { value: 'Calme', label: 'Le matin avant 9 h' },
      { value: '3\u00a0chiens', label: 'Cette semaine' },
      { value: '640 m', label: 'D’ici' },
    ])
    // Rien de connu : des valeurs vides (le composant Stats ne les affiche pas).
    expect(spotStats({ votes: [], dogs: 0 }).every((s) => s.value === '')).toBe(true)
  })

  it('un conseil sans avis n’est pas un avis de calme', () => {
    expect(calmSummary([{ slot: undefined, level: undefined }])).toBeUndefined()
    expect(calmSummary([{ level: 'calme', slot: 'matin' }, {}])?.detail).toBe('avis de 1 membre')
  })

  it('garde les 3 conseils les plus récents, avec auteur et date', () => {
    const tips = spotTips([
      { tip: 'Entrée côté rivière', dogName: 'Rex', date: '2026-10-12' },
      { level: 'calme', date: '2026-10-20' } as { tip?: string; date: string },
      { tip: '  ', dogName: 'Pif', date: '2026-10-21' },
      { tip: 'Gamelle près du kiosque', dogName: 'Nala', date: '2026-10-20' },
      { tip: 'Fermé le lundi', date: '2026-10-18' },
      { tip: 'Ancien', dogName: 'Oslo', date: '2026-09-01' },
    ])
    expect(tips).toEqual([
      { text: 'Gamelle près du kiosque', by: 'Nala', date: '2026-10-20' },
      { text: 'Fermé le lundi', by: 'Un membre', date: '2026-10-18' },
      { text: 'Entrée côté rivière', by: 'Rex', date: '2026-10-12' },
    ])
  })

  it('range les pastilles : eau, ombre, laisse, puis le reste', () => {
    expect(spotPills(['Fermé la nuit', 'Laisse obligatoire', 'Point d’eau', 'Ombre'])).toEqual(['Point d’eau', 'Ombre', 'Laisse obligatoire', 'Fermé la nuit'])
    expect(spotPills(undefined)).toEqual([])
  })
})
