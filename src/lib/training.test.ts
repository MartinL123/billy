import { describe, expect, it } from 'vitest'
import { allTriggers, EXERCISES, exerciseById, exerciseStatus, fearSummaries, isUnlocked, mastery, streak } from './training'

const session = (date: string, result: 'difficile' | 'moyen' | 'reussi', exerciseId = 'assis') => ({ date, exerciseId, result })

describe('programme', () => {
  it('a des identifiants uniques', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
  })

  it('passe de « à découvrir » à « en cours » puis « acquis »', () => {
    expect(exerciseStatus([], 'assis')).toBe('a-decouvrir')
    expect(exerciseStatus([session('2026-10-01', 'reussi', 'rappel')], 'assis')).toBe('a-decouvrir')
    expect(exerciseStatus([session('2026-10-01', 'reussi')], 'assis')).toBe('en-cours')
    expect(exerciseStatus([session('2026-10-01', 'reussi'), session('2026-10-02', 'reussi')], 'assis')).toBe('en-cours')
    expect(exerciseStatus([session('2026-10-01', 'reussi'), session('2026-10-02', 'reussi'), session('2026-10-03', 'reussi')], 'assis')).toBe('acquis')
  })

  it('redevient « en cours » après une séance ratée', () => {
    const sessions = [session('2026-10-01', 'reussi'), session('2026-10-02', 'reussi'), session('2026-10-03', 'reussi'), session('2026-10-04', 'difficile')]
    expect(exerciseStatus(sessions, 'assis')).toBe('en-cours')
    expect(exerciseStatus([session('2026-10-01', 'difficile'), ...sessions.slice(1, 3), session('2026-10-05', 'reussi')], 'assis')).toBe('acquis')
  })
})

describe('série', () => {
  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(streak(['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-13'], '2026-10-13')).toBe(3)
    expect(streak(['2026-10-09', '2026-10-12', '2026-10-13'], '2026-10-13')).toBe(2)
  })

  it('tient encore si la dernière séance date d’hier', () => {
    expect(streak(['2026-10-11', '2026-10-12'], '2026-10-13')).toBe(2)
  })

  it('retombe à zéro après un jour sans rien, et passe les changements de mois', () => {
    expect(streak(['2026-10-10', '2026-10-11'], '2026-10-13')).toBe(0)
    expect(streak([], '2026-10-13')).toBe(0)
    expect(streak(['2026-09-29', '2026-09-30', '2026-10-01'], '2026-10-01')).toBe(3)
  })
})

describe('peurs', () => {
  const exposures = [
    { date: '2026-10-01', trigger: 'La ruelle', fear: 4, distance: 20 },
    { date: '2026-10-08', trigger: 'la ruelle ', fear: 3, distance: 10 },
    { date: '2026-10-12', trigger: 'La ruelle', fear: 2, distance: 5 },
    { date: '2026-10-05', trigger: 'Les enfants', fear: 3 },
    { date: '2026-10-10', trigger: 'Les enfants', fear: 4 },
    { date: '2026-10-11', trigger: 'Le skate', fear: 5 },
  ]

  it('regroupe par déclencheur, le plus récemment noté d’abord', () => {
    const summaries = fearSummaries(exposures)
    expect(summaries.map((s) => [s.trigger, s.exposures.length])).toEqual([
      ['La ruelle', 3],
      ['Le skate', 1],
      ['Les enfants', 2],
    ])
  })

  it('compare la dernière exposition à la première', () => {
    const [ruelle, skate, enfants] = fearSummaries(exposures)
    expect([ruelle!.first.fear, ruelle!.latest.fear, ruelle!.trend]).toEqual([4, 2, 'mieux'])
    expect(skate!.trend).toBe('stable')
    expect(enfants!.trend).toBe('moins-bien')
  })

  it('propose les déclencheurs connus sans doublon', () => {
    expect(allTriggers(['la ruelle', 'Le skate', ''])).toEqual(['La ruelle', 'Les enfants', 'Le reflet la nuit', 'Le skate'])
  })
})

describe('maîtrise d’un ordre', () => {
  const run = (...results: ('difficile' | 'moyen' | 'reussi')[]) => results.map((result, i) => session(`2026-10-${String(i + 1).padStart(2, '0')}`, result))

  it('ne dit rien sans séance', () => {
    expect(mastery([], 'assis')).toEqual({ count: 0, recent: [] })
  })

  it('note sur les 5 dernières séances', () => {
    expect(mastery(run('reussi'), 'assis')).toMatchObject({ count: 1, percent: 100, trend: undefined })
    expect(mastery(run('difficile', 'moyen'), 'assis').percent).toBe(25)
    expect(mastery(run('difficile', 'difficile', 'reussi', 'reussi', 'reussi', 'reussi', 'reussi'), 'assis').percent).toBe(100)
  })

  it('voit une amélioration', () => {
    expect(mastery(run('difficile', 'difficile', 'moyen', 'moyen', 'reussi', 'reussi'), 'assis').trend).toBe('mieux')
  })

  it('voit une dégradation', () => {
    const m = mastery(run('reussi', 'reussi', 'reussi', 'moyen', 'difficile', 'difficile'), 'assis')
    expect(m.trend).toBe('moins-bien')
    expect(m.recent).toEqual(['reussi', 'reussi', 'reussi', 'moyen', 'difficile', 'difficile'])
  })

  it('reste stable quand ça ne bouge pas', () => {
    expect(mastery(run('moyen', 'moyen', 'moyen', 'moyen'), 'assis').trend).toBe('stable')
  })
})

describe('ordres « plus tard »', () => {
  const traverse = exerciseById('traverse')!
  const acquired = (id: string) => [1, 2, 3].map((d) => session(`2026-10-0${d}`, 'reussi', id))

  it('ont des prérequis qui existent', () => {
    for (const exercise of EXERCISES) for (const id of exercise.requires ?? []) expect(exerciseById(id)).toBeDefined()
  })

  it('se débloquent quand les prérequis sont acquis', () => {
    expect(isUnlocked([], traverse)).toBe(false)
    expect(isUnlocked(acquired('pas-bouger'), traverse)).toBe(false)
    expect(isUnlocked([...acquired('pas-bouger'), ...acquired('laisse')], traverse)).toBe(true)
  })

  it('restent ouverts une fois commencés', () => {
    expect(isUnlocked([session('2026-10-01', 'difficile', 'traverse')], traverse)).toBe(true)
    expect(isUnlocked([], exerciseById('assis')!)).toBe(true)
  })
})
