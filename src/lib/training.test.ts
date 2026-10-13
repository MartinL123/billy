import { describe, expect, it } from 'vitest'
import { allTriggers, EXERCISES, exerciseById, exerciseStatus, fearSummaries, isUnlocked, levelGoal, markId, mastery, progress, streak } from './training'

const session = (date: string, result: 'difficile' | 'moyen' | 'reussi', exerciseId = 'assis') => ({ date, exerciseId, result })

const assis = exerciseById('assis')!
const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`
/** Séances successives sur un ordre, une par jour. */
const run = (id: string, ...results: ('difficile' | 'moyen' | 'reussi')[]) => results.map((result, i) => session(day(i + 1), result, id))
const skip = (date: string, id: string) => session(date, 'reussi', markId(id))
const back = (date: string, id: string) => session(date, 'difficile', markId(id))

describe('arbre', () => {
  it('a des identifiants uniques, des paliers et des parents qui existent', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
    for (const exercise of EXERCISES) {
      expect(exercise.levels.length).toBeGreaterThanOrEqual(3)
      expect(exercise.steps.length).toBeGreaterThanOrEqual(2)
      if (exercise.parent) expect(exerciseById(exercise.parent)).toBeDefined()
      for (const [id, levels] of exercise.requires ?? []) expect(exerciseById(id)!.levels.length).toBeGreaterThanOrEqual(levels)
    }
  })
})

describe('paliers', () => {
  it('commence au palier 1', () => {
    expect(progress([], assis)).toMatchObject({ level: 1, total: 5, successes: 0, maintenance: false, started: false })
    expect(exerciseStatus([], 'assis')).toBe('a-decouvrir')
  })

  it('montre chaque réussite avant de valider le palier à la troisième', () => {
    expect(progress(run('assis', 'reussi'), assis)).toMatchObject({ level: 1, successes: 1, started: true })
    expect(progress(run('assis', 'reussi', 'reussi'), assis)).toMatchObject({ level: 1, successes: 2 })
    expect(progress(run('assis', 'reussi', 'reussi', 'reussi'), assis)).toMatchObject({ level: 2, successes: 0, validations: [day(3)] })
    expect(exerciseStatus(run('assis', 'reussi'), 'assis')).toBe('en-cours')
  })

  it('accepte un raté : 3 réussites sur les 4 dernières séances', () => {
    expect(progress(run('assis', 'reussi', 'moyen', 'reussi', 'reussi'), assis).level).toBe(2)
    expect(progress(run('assis', 'reussi', 'difficile', 'moyen', 'reussi', 'reussi'), assis)).toMatchObject({ level: 1, successes: 2 })
  })

  it('repart de zéro au palier suivant', () => {
    const sessions = run('assis', 'reussi', 'reussi', 'reussi', 'reussi', 'moyen')
    expect(progress(sessions, assis)).toMatchObject({ level: 2, successes: 1 })
  })

  it('saute un palier avec « il sait déjà », sans le compter comme validé par la pratique', () => {
    const p = progress([skip(day(1), 'assis'), skip(day(1), 'assis')], assis)
    expect(p).toMatchObject({ level: 3, successes: 0, validations: [], started: true })
  })

  it('redescend d’un palier sur demande, jamais sous le premier', () => {
    expect(progress([skip(day(1), 'assis'), back(day(2), 'assis')], assis).level).toBe(1)
    expect(progress([back(day(1), 'assis')], assis).level).toBe(1)
  })

  it('repère deux séances difficiles de suite', () => {
    expect(progress(run('assis', 'moyen', 'difficile', 'difficile'), assis).struggling).toBe(true)
    expect(progress(run('assis', 'difficile', 'difficile', 'moyen'), assis).struggling).toBe(false)
  })

  it('n’est jamais fini : après le dernier palier vient l’entretien', () => {
    const all = Array.from({ length: 5 }, (_, i) => skip(day(i + 1), 'assis'))
    const p = progress([...all, session(day(10), 'reussi')], assis)
    expect(p).toMatchObject({ level: 6, total: 5, maintenance: true })
    expect(progress([...all, skip(day(11), 'assis')], assis).level).toBe(6)
    expect(exerciseStatus(all, 'assis')).toBe('entretien')
    expect(levelGoal(assis, 6)).toContain('Entretien')
    expect(levelGoal(assis, 1)).toBe(assis.levels[0])
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

describe('tendance d’un ordre', () => {
  it('ne dit rien avant 4 séances', () => {
    expect(mastery([], 'assis')).toEqual({ count: 0, recent: [] })
    expect(mastery(run('assis', 'reussi'), 'assis')).toMatchObject({ count: 1, trend: undefined })
  })

  it('voit une amélioration', () => {
    expect(mastery(run('assis', 'difficile', 'difficile', 'moyen', 'moyen', 'reussi', 'reussi'), 'assis').trend).toBe('mieux')
  })

  it('voit une dégradation', () => {
    const m = mastery(run('assis', 'reussi', 'reussi', 'reussi', 'moyen', 'difficile', 'difficile'), 'assis')
    expect(m.trend).toBe('moins-bien')
    expect(m.recent).toEqual(['reussi', 'reussi', 'reussi', 'moyen', 'difficile', 'difficile'])
  })

  it('reste stable quand ça ne bouge pas', () => {
    expect(mastery(run('assis', 'moyen', 'moyen', 'moyen', 'moyen'), 'assis').trend).toBe('stable')
  })
})

describe('ordres verrouillés', () => {
  const pasBouger = exerciseById('pas-bouger')!
  const autrePatte = exerciseById('autre-patte')!

  it('s’ouvrent quand les prérequis ont assez de paliers validés', () => {
    expect(isUnlocked([], assis)).toBe(true)
    expect(isUnlocked([], pasBouger)).toBe(false)
    expect(isUnlocked([skip(day(1), 'assis')], pasBouger)).toBe(false)
    expect(isUnlocked([skip(day(1), 'assis'), skip(day(1), 'assis')], pasBouger)).toBe(true)
  })

  it('suivent la chaîne : la patte, puis l’autre patte', () => {
    const patte3 = [1, 2, 3].map(() => skip(day(1), 'patte'))
    expect(isUnlocked(patte3.slice(0, 2), autrePatte)).toBe(false)
    expect(isUnlocked(patte3, autrePatte)).toBe(true)
  })

  it('restent ouverts une fois essayés', () => {
    expect(isUnlocked([session(day(1), 'difficile', 'pas-bouger')], pasBouger)).toBe(true)
  })
})
