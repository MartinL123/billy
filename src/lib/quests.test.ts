import { describe, expect, it } from 'vitest'
import { FIRSTS, reachedFirsts } from './firsts'
import { questDone, questPool, questProgress, QUESTS_PER_WEEK, weekQuests } from './quests'

const billy = ['chiot', 'craintif'] as const

describe('quêtes hebdomadaires', () => {
  it('en propose 3 au plus, tirées des boss conseillés', () => {
    const quests = weekQuests('2026-10-12', [...billy])
    expect(quests).toHaveLength(QUESTS_PER_WEEK)
    expect(new Set(quests.map((q) => q.key)).size).toBe(3)
  })

  it('sont les mêmes toute la semaine et changent la semaine suivante', () => {
    const keys = (week: string) => weekQuests(week, [...billy]).map((q) => q.key)
    expect(keys('2026-10-12')).toEqual(keys('2026-10-12'))
    expect(keys('2026-10-19')).not.toEqual(keys('2026-10-12'))
  })

  it('remplace une quête par la suivante, sans en perdre', () => {
    const before = weekQuests('2026-10-12', [...billy])
    const after = weekQuests('2026-10-12', [...billy], [before[0]!.key])
    expect(after).toHaveLength(3)
    expect(after.map((q) => q.key)).not.toContain(before[0]!.key)
    expect(after.slice(0, 2)).toEqual(before.slice(1))
  })

  it('ne demandent jamais de se rapprocher d’un déclencheur', () => {
    for (const quest of questPool([...billy])) expect(quest.label.toLowerCase()).not.toMatch(/près|rapproch|approch/)
  })

  it('suivent l’avancement sur la semaine en cours seulement', () => {
    const data = {
      sessions: [
        { date: '2026-10-12', bossId: 'lien' },
        { date: '2026-10-13', bossId: 'lien' },
        { date: '2026-10-05', bossId: 'lien' },
        { date: '2026-10-13', bossId: 'ville' },
      ],
      exposures: [
        { date: '2026-10-13', distance: '>10', retreat: false },
        { date: '2026-10-13', distance: '<2', retreat: false },
        { date: '2026-10-14', retreat: true },
      ],
      rests: [{ date: '2026-10-14', sniff: false }],
    }
    const today = '2026-10-14'
    expect(questProgress({ key: 'seances-lien', label: '', target: 3 }, today, data)).toBe(2)
    expect(questProgress({ key: 'expositions-loin', label: '', target: 2 }, today, data)).toBe(2)
    expect(questDone({ key: 'expositions-loin', label: '', target: 2 }, today, data)).toBe(true)
    expect(questProgress({ key: 'reniflage', label: '', target: 1 }, today, data)).toBe(0)
    expect(questProgress({ key: 'repos', label: '', target: 1 }, today, data)).toBe(1)
    expect(questProgress({ key: 'trois-jours', label: '', target: 3 }, today, data)).toBe(2)
  })

  it('plafonnent l’avancement à la cible', () => {
    const sessions = [1, 2, 3, 4, 5].map(() => ({ date: '2026-10-13', bossId: 'lien' }))
    expect(questProgress({ key: 'seances-lien', label: '', target: 3 }, '2026-10-13', { sessions, exposures: [], rests: [] })).toBe(3)
  })
})

describe('premières fois', () => {
  const empty = { sessions: [], exposures: [], log: [] }

  it('ne donnent rien au départ', () => {
    expect(reachedFirsts(empty)).toEqual([])
  })

  it('datent chaque première fois au jour où elle est arrivée', () => {
    const reached = reachedFirsts({
      sessions: [
        { date: '2026-10-13', bossId: 'lien', trials: [true, true, false, true, true] },
        { date: '2026-10-14', bossId: 'lien', trials: [true, true, true, true, true] },
        { date: '2026-10-15', bossId: 'calme', trials: [false] },
        { date: '2026-10-16', bossId: 'ville', trials: [false] },
      ],
      exposures: [
        { date: '2026-10-12', reaction: 3, retreat: false },
        { date: '2026-10-15', reaction: 0, retreat: true },
      ],
      log: [
        { id: 'repos-2026-10-11', date: '2026-10-11', kind: 'repos' },
        { id: 'palier-lien-1', date: '2026-10-20', kind: 'palier' },
        { id: 'palier-lien-3', date: '2026-11-20', kind: 'palier' },
      ],
    })
    expect(Object.fromEntries(reached.map((r) => [r.key, r.date]))).toEqual({
      seance: '2026-10-13',
      exposition: '2026-10-12',
      retraite: '2026-10-15',
      repos: '2026-10-11',
      palier: '2026-10-20',
      dehors: '2026-11-20',
      'sans-faute': '2026-10-14',
      detendu: '2026-10-15',
      'trois-boss': '2026-10-16',
    })
  })

  it('ont toutes un libellé, et quelques-unes sont cachées', () => {
    expect(new Set(FIRSTS.map((f) => f.key)).size).toBe(FIRSTS.length)
    expect(FIRSTS.filter((f) => f.hidden).length).toBeGreaterThanOrEqual(2)
  })
})
