import { describe, expect, it } from 'vitest'
import { emptyPillText, journalDayLabel, journalGroups, journalItems, pillOf, weekSummary } from './dogJournal'
import type { Route } from './route'

const route = (distanceM: number, startTime?: string): Route => ({ points: [[48.85, 2.35], [48.86, 2.35]], distanceM, moments: [], ...(startTime ? { startTime } : {}) })
const walk = (id: string, date: string, distanceM: number, startTime?: string) => ({ id, date, route: route(distanceM, startTime) })

const TODAY = '2026-10-23' // un vendredi

const input = () => ({
  walks: [walk('a', '2026-10-21', 2400, '2026-10-21T07:02:00Z'), walk('b', '2026-10-18', 2000), walk('c', '2026-10-17', 2800)],
  outings: [{ id: '2026-10-23:matin', date: '2026-10-23', slot: 'matin' as const, minutes: 35, time: '08:00' }],
  entries: [
    { id: 'souv', date: TODAY, text: 'Premier tour au parc\nIl a reniflé un pigeon.', photos: [{ thumbFileId: 't1' }], feeling: 'super', createdAt: `${TODAY}T09:30:00Z` },
    { id: 'seance', date: TODAY, text: 'Au calme, 3 minutes.', photos: [], skills: ['lien'], feeling: 'super', createdAt: `${TODAY}T10:30:00Z` },
    { id: 'repos-2026-10-22', date: '2026-10-22', text: 'Repos', photos: [] },
    { id: 'vide', date: '2026-10-22', text: ' ', photos: [] },
    { id: 'balade', date: '2026-10-21', text: 'Balade', photos: [], route: { points: [1, 2] } },
  ],
  events: [
    { id: 'v1', title: 'Vermifuge', type: 'vermifuge', date: '2026-10-21', done: true, doneAt: '2026-10-21', nextId: 'v2' },
    { id: 'v2', title: 'Vermifuge', type: 'vermifuge', date: '2027-01-21', done: false },
    { id: 'vac', title: 'Vaccin', type: 'vaccin', date: '2026-09-01', done: true },
    { id: 'sej', title: 'Pension', type: 'sejour', date: '2026-10-20', done: true },
    { id: 'pas-fait', title: 'Vaccin', type: 'vaccin', date: '2026-10-22', done: false },
  ],
  weights: [
    { id: 'w2', date: '2026-10-17', kg: 8.7 },
    { id: 'w1', date: '2026-10-01', kg: 7.8 },
  ],
})

describe('R-098 · le journal du chien', () => {
  it('toutes les sortes, du plus récent au plus ancien ; dans un jour, le plus récent d’abord', () => {
    const items = journalItems(input())
    expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual(['session:seance', 'memo:souv', 'outing:2026-10-23:matin', 'care:v1', 'walk:a', 'walk:b', 'walk:c', 'weight:w2', 'weight:w1', 'care:vac'])
  })

  it('les lignes : sortie notée, souvenir, séance, soin, pesée', () => {
    const byId = new Map(journalItems(input()).map((i) => [i.id, i]))
    const text = (id: string) => {
      const item = byId.get(id)!
      return 'title' in item ? [item.title, item.line] : []
    }
    expect(text('2026-10-23:matin')).toEqual(['Sortie du matin · 35 min', 'Notée sans trajet, vers 8 h'])
    expect(text('souv')).toEqual(['Premier tour au parc', '« Il a reniflé un pigeon. » · Super'])
    expect(text('seance')).toEqual(['Séance · Le Lien', '« Au calme » · 3 min · Super'])
    expect(text('v1')).toEqual(['Vermifuge donné', 'Prochain : 21 janvier 2027'])
    // Sans lien gardé : le même soin à venir le plus proche.
    expect(text('vac')).toEqual(['Vaccin fait', 'Prochain\u00a0: 22 octobre 2026'])
    expect(text('w2')).toEqual(['Pesée · 8,7 kg', '+0,9 kg en 16 jours'])
    expect(text('w1')).toEqual(['Pesée · 7,8 kg', 'Première pesée'])
  })

  it('R-100 : « Prochain » seulement sous le dernier soin fait de chaque sorte', () => {
    const base = input()
    const events = [
      { id: 'v0', title: 'Vermifuge', type: 'vermifuge', date: '2026-07-21', done: true, doneAt: '2026-07-21', nextId: 'v1' },
      ...base.events,
      { id: 'vac0', title: 'Vaccin', type: 'vaccin', date: '2025-09-01', done: true },
    ]
    const byId = new Map(journalItems({ ...base, events }).map((i) => [i.id, i]))
    const line = (id: string) => {
      const item = byId.get(id)!
      return 'title' in item ? [item.title, item.line] : []
    }
    // L’ancien vermifuge : juste ce qui a été fait, même s’il gardait le lien vers le suivant.
    expect(line('v0')).toEqual(['Vermifuge donné', ''])
    expect(line('v1')).toEqual(['Vermifuge donné', 'Prochain\u00a0: 21 janvier 2027'])
    expect(line('vac0')).toEqual(['Vaccin fait', ''])
    expect(line('vac')).toEqual(['Vaccin fait', 'Prochain\u00a0: 22 octobre 2026'])
  })

  it('les pastilles filtrent ; les jours se nomment', () => {
    const items = journalItems(input())
    const groups = journalGroups(items, 'tout', TODAY)
    expect(groups.map((g) => g.label)).toEqual(['Aujourd’hui, vendredi 23 octobre', 'Mercredi 21 octobre', 'Dimanche 18 octobre', 'Samedi 17 octobre', 'Jeudi 1er octobre', 'Mardi 1er septembre'])
    expect(journalGroups(items, 'balades', TODAY).flatMap((g) => g.items.map((i) => i.id))).toEqual(['2026-10-23:matin', 'a', 'b', 'c'])
    expect(journalGroups(items, 'souvenirs', TODAY).flatMap((g) => g.items.map((i) => i.id))).toEqual(['souv'])
    expect(journalGroups(items, 'seances', TODAY).flatMap((g) => g.items.map((i) => i.id))).toEqual(['seance'])
    expect(journalGroups(items, 'sante', TODAY).flatMap((g) => g.items.map((i) => i.id))).toEqual(['v1', 'w2', 'w1', 'vac'])
    expect(items.every((i) => pillOf(i) !== 'tout')).toBe(true)
    expect(journalDayLabel('2026-10-22', TODAY)).toBe('Hier, jeudi 22 octobre')
    expect(journalDayLabel('2025-10-22', TODAY)).toBe('Mercredi 22 octobre 2025')
    expect(journalGroups([], 'sante', TODAY)).toEqual([])
    expect(emptyPillText('sante')).toBe('Rien de fait pour sa santé pour l’instant.')
  })

  it('le résumé de la semaine (depuis lundi) : seulement ce qui n’est pas à 0', () => {
    const items = journalItems(input())
    // Lundi 19 → vendredi 23 : la balade du 21 et la sortie notée (2), 2,4 km, 1 souvenir, 1 séance.
    expect(weekSummary(items, TODAY)).toEqual([
      { n: '2', label: 'balades' },
      { n: '2,4', label: 'km' },
      { n: '1', label: 'souvenir' },
      { n: '1', label: 'séance' },
    ])
    expect(weekSummary(items, '2026-11-20')).toEqual([])
  })
})
