import { describe, expect, it } from 'vitest'
import { allTriggers, EXERCISES, exerciseStatus, fearSummaries, streak } from './training'

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
