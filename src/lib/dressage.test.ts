import { describe, expect, it } from 'vitest'
import { bossById } from '../content/training'
import { addValidation, EMPTY_PROGRESS, levelsAcquired, linkLit, needsPlace, remaining, softAdvice, starsEarned, validateDirectly, type BossProgress } from './bossProgress'
import { recommendSession, sessionLink } from './recommend'
import { applyDecision, canValidate, currentDifficulty, lastSession, suggest } from './session'
import { exercisesFor, featuredBosses, guards, levelFourUnadvised, suggestedBosses } from './traits'
import { bossReactions, weather } from './weather'
import { exposureXp, globalLevel, rank, restXp, sessionXp, totalXp, xpByBoss, xpByStat, xpForLevel } from './xp'

const EXERCISES_FOR_LIEN = exercisesFor('lien', ['chiot', 'craintif']).map((e) => e.id)

const T = true
const F = false

describe('XP', () => {
  it('donne 10 par séance, quel que soit le résultat', () => {
    expect(sessionXp([F, F, F, F, F], 'baisser', 'monter')).toBe(10)
  })

  it('ajoute 1 par essai réussi, plafonné à 5', () => {
    expect(sessionXp([T, T, T, F, F], 'rester', 'monter')).toBe(13)
    expect(sessionXp([T, T, T, T, T, T, T], 'monter', 'monter')).toBe(15)
  })

  it('récompense « Baisser » ou « Rester » accepté, pas « Monter »', () => {
    expect(sessionXp([F, F, F, F, F], 'baisser', 'baisser')).toBe(13)
    expect(sessionXp([T, T, T, F, F], 'rester', 'rester')).toBe(16)
    expect(sessionXp([T, T, T, T, T], 'monter', 'monter')).toBe(15)
    expect(sessionXp([T, T, T, F, F], 'rester', 'baisser')).toBe(13)
  })

  it('récompense l’enregistrement, le calme et le recul d’une exposition', () => {
    expect(exposureXp(4, false)).toBe(5)
    expect(exposureXp(1, false)).toBe(8)
    expect(exposureXp(3, true)).toBe(13)
    expect(exposureXp(0, true)).toBe(16)
  })

  it('compte le repos au plus 3 fois par semaine', () => {
    const week = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']
    const rest = (date: string, xp = 5) => ({ date, kind: 'repos', xp })
    expect(restXp([], week)).toBe(5)
    expect(restXp([rest('2026-10-12'), rest('2026-10-13')], week)).toBe(5)
    expect(restXp([rest('2026-10-12'), rest('2026-10-13'), rest('2026-10-14')], week)).toBe(0)
    expect(restXp([rest('2026-10-05'), rest('2026-10-06'), rest('2026-10-07')], week)).toBe(5)
  })

  it('ne compte jamais de valeur négative', () => {
    const log = [
      { date: '2026-10-01', kind: 'seance', xp: 13, bossId: 'lien' },
      { date: '2026-10-02', kind: 'exposition', xp: -50, bossId: 'ville' },
    ]
    expect(totalXp(log)).toBe(13)
  })

  it('répartit l’XP entre le boss et ses stats', () => {
    const log = [
      { date: '2026-09-01', kind: 'seance', xp: 10, bossId: 'laisse' },
      { date: '2026-10-10', kind: 'exposition', xp: 8, bossId: 'rencontres' },
      { date: '2026-10-11', kind: 'repos', xp: 5 },
      { date: '2026-10-12', kind: 'quete', xp: 15 },
    ]
    expect(xpByStat(log)).toEqual({ calme: 15, courage: 8, rappel: 0, focus: 10, sociabilite: 8 })
    expect(xpByStat(log, '2026-09-13')).toEqual({ calme: 10, courage: 0, rappel: 0, focus: 10, sociabilite: 0 })
    expect(xpByBoss(log)).toEqual({ laisse: 10, rencontres: 8 })
  })
})

describe('niveau global et rang', () => {
  it('commence au niveau 1 et suit 25 × (L−1) × L', () => {
    expect([1, 2, 4, 8, 11].map(xpForLevel)).toEqual([0, 50, 300, 1400, 2750])
    expect(globalLevel(0)).toEqual({ level: 1, current: 0, needed: 50 })
    expect(globalLevel(49).level).toBe(1)
    expect(globalLevel(50)).toEqual({ level: 2, current: 0, needed: 100 })
    expect(globalLevel(320)).toEqual({ level: 4, current: 20, needed: 200 })
    expect(globalLevel(1_000_000).level).toBeGreaterThan(100)
  })

  it('nomme le rang selon les paliers acquis, puis les étoiles', () => {
    expect([0, 4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 50].map((n) => rank(n, 0))).toEqual([
      'Chiot curieux', 'Chiot curieux', 'Apprenti', 'Apprenti', 'Compagnon', 'Compagnon',
      'Citadin', 'Citadin', 'Complice', 'Complice', 'Légende', 'Légende',
    ])
    expect(rank(50, 3)).toBe('Légende ★ 3')
    expect(rank(20, 3)).toBe('Compagnon')
  })
})

describe('suggestion de fin de séance', () => {
  it('suit le score : 5/5 monter, 3–4/5 rester, ≤ 2/5 baisser', () => {
    expect(suggest([T, T, T, T, T], true)).toBe('monter')
    expect(suggest([T, T, T, T, F], true)).toBe('rester')
    expect(suggest([T, T, T, F, F], true)).toBe('rester')
    expect(suggest([T, T, F, F, F], true)).toBe('baisser')
    expect(suggest([F, F, F, F, F], true)).toBe('baisser')
  })

  it('propose toujours de baisser s’il n’a pas pris ses friandises', () => {
    expect(suggest([T, T, T, T, T], false)).toBe('baisser')
  })

  it('règle la difficulté entre N1 et N5', () => {
    expect(applyDecision(2, 'monter')).toBe(3)
    expect(applyDecision(2, 'rester')).toBe(2)
    expect(applyDecision(2, 'baisser')).toBe(1)
    expect(applyDecision(1, 'baisser')).toBe(1)
    expect(applyDecision(5, 'monter')).toBe(5)
  })

  it('reprend la difficulté décidée à la dernière séance', () => {
    const sessions = [
      { date: '2026-10-01', exerciseId: 'prenom', difficulty: 1, decision: 'monter' as const },
      { date: '2026-10-03', exerciseId: 'prenom', difficulty: 2, decision: 'monter' as const },
      { date: '2026-10-02', exerciseId: 'tapis', difficulty: 4, decision: 'baisser' as const },
    ]
    expect(currentDifficulty(sessions, 'prenom')).toBe(3)
    expect(currentDifficulty(sessions, 'tapis')).toBe(3)
    expect(currentDifficulty(sessions, 'touche')).toBe(1)
    expect(lastSession(sessions)?.exerciseId).toBe('prenom')
    expect(lastSession([])).toBeUndefined()
  })

  it('ne laisse valider un critère que s’il a mangé et que la réaction est ≤ 1', () => {
    expect(canValidate(true, 0)).toBe(true)
    expect(canValidate(true, 1)).toBe(true)
    expect(canValidate(true, 2)).toBe(false)
    expect(canValidate(false, 0)).toBe(false)
    expect(canValidate(true, undefined)).toBe(false)
  })
})

describe('validation des paliers', () => {
  const validate = (progress: BossProgress, ...days: [string, string?][]) =>
    days.reduce((p, [date, place]) => addValidation(p, date, place).progress, progress)

  it('demande 3 validations sur 3 jours différents', () => {
    let result = addValidation(EMPTY_PROGRESS, '2026-10-01')
    expect(result.validated).toBe(true)
    expect(result.levelGained).toBeUndefined()
    expect(remaining(result.progress)).toEqual({ target: 1, done: 1, needed: 3 })
    result = addValidation(result.progress, '2026-10-01')
    expect(result.validated).toBe(false)
    result = addValidation(result.progress, '2026-10-02')
    expect(remaining(result.progress).done).toBe(2)
    result = addValidation(result.progress, '2026-10-05')
    expect(result).toMatchObject({ validated: true, levelGained: 1 })
    expect(result.progress.level).toBe(1)
    expect(remaining(result.progress)).toEqual({ target: 2, done: 0, needed: 3 })
  })

  it('garde un palier acquis pour toujours', () => {
    const p = validate(EMPTY_PROGRESS, ['2026-10-01'], ['2026-10-02'], ['2026-10-03'])
    expect(validateDirectly(p, 0).level).toBe(1)
    expect(addValidation(p, '2026-10-04').progress.level).toBe(1)
  })

  it('valide directement un palier déjà maîtrisé, sans jamais baisser', () => {
    expect(validateDirectly(EMPTY_PROGRESS, 3).level).toBe(3)
    expect(validateDirectly({ ...EMPTY_PROGRESS, level: 4 }, 2).level).toBe(4)
    expect(validateDirectly(EMPTY_PROGRESS, 9).level).toBe(5)
  })

  it('demande 3 lieux différents pour P5', () => {
    const p4 = { ...EMPTY_PROGRESS, level: 4 }
    expect(needsPlace(p4)).toBe(true)
    expect(needsPlace({ ...EMPTY_PROGRESS, level: 3 })).toBe(false)
    const sameplace = validate(p4, ['2026-10-01', 'parc'], ['2026-10-02', 'parc'], ['2026-10-03', 'parc'])
    expect(sameplace.level).toBe(4)
    expect(remaining(sameplace)).toMatchObject({ target: 5, done: 1, placesDone: 1 })
    const three = validate(p4, ['2026-10-01', 'parc'], ['2026-10-02', 'quai'], ['2026-10-03', 'place'])
    expect(three.level).toBe(5)
  })

  it('ajoute une étoile par nouveau lieu après P5, sans plafond', () => {
    const p5 = validate({ ...EMPTY_PROGRESS, level: 4 }, ['2026-10-01', 'parc'], ['2026-10-02', 'quai'], ['2026-10-03', 'place'])
    expect(addValidation(p5, '2026-10-04', 'parc')).toMatchObject({ validated: false })
    expect(addValidation(p5, '2026-10-04')).toMatchObject({ validated: false })
    const star = addValidation(p5, '2026-10-04', 'foret')
    expect(star).toMatchObject({ validated: true, starPlaceId: 'foret' })
    expect(addValidation(star.progress, '2026-10-05', 'foret').validated).toBe(false)
    expect(addValidation(star.progress, '2026-10-05', 'plage').progress.masteryPlaces).toEqual(['foret', 'plage'])
    expect(remaining(p5)).toEqual({ done: 0, needed: 0 })
  })

  it('additionne paliers et étoiles pour le rang', () => {
    const map = { lien: { level: 3, validations: [], masteryPlaces: [] }, ville: { level: 5, validations: [], masteryPlaces: ['a', 'b'] }, calme: undefined }
    expect(levelsAcquired(map)).toBe(8)
    expect(starsEarned(map)).toBe(2)
  })
})

describe('liens conseillés, jamais bloquants', () => {
  const ville = bossById('ville')!
  const at = (levels: Record<string, number>) => Object.fromEntries(Object.entries(levels).map(([id, level]) => [id, { ...EMPTY_PROGRESS, level }]))

  it('donne un conseil doux pour le palier visé', () => {
    expect(softAdvice(ville, at({ ville: 2 }))).toEqual({ level: 3, missing: [{ bossId: 'lien', level: 2 }, { bossId: 'nouveaute', level: 2 }] })
    expect(softAdvice(ville, at({ ville: 2, lien: 2 }))?.missing).toEqual([{ bossId: 'nouveaute', level: 2 }])
    expect(softAdvice(ville, at({ ville: 2, lien: 2, nouveaute: 3 }))).toBeUndefined()
    expect(softAdvice(ville, at({ ville: 3 }))?.missing).toEqual([{ bossId: 'laisse', level: 3 }])
  })

  it('ne dit rien quand aucun lien ne concerne le palier visé', () => {
    expect(softAdvice(ville, {})).toBeUndefined()
    expect(softAdvice(bossById('lien')!, {})).toBeUndefined()
  })

  it('allume un lien quand son prérequis est atteint', () => {
    expect(linkLit(at({ lien: 1 }), { bossId: 'lien', level: 2 })).toBe(false)
    expect(linkLit(at({ lien: 2 }), { bossId: 'lien', level: 2 })).toBe(true)
  })
})

describe('météo de confiance', () => {
  it('suit la moyenne des 3 dernières réactions', () => {
    expect(weather([])).toBeUndefined()
    expect(weather([0, 1, 1])).toBe('soleil')
    expect(weather([1, 1, 1])).toBe('eclaircies')
    expect(weather([2, 2, 3])).toBe('nuageux')
    expect(weather([3, 3, 3])).toBe('averse')
    expect(weather([4])).toBe('averse')
  })

  it('ne regarde que les 3 plus récentes : elle remonte après une mauvaise passe', () => {
    expect(weather([0, 0, 0, 4, 4, 4])).toBe('soleil')
  })

  it('rassemble séances et expositions d’un boss, la plus récente d’abord', () => {
    const records = [
      { date: '2026-10-01', bossId: 'ville', reaction: 3 },
      { date: '2026-10-03', bossId: 'ville', reaction: 0 },
      { date: '2026-10-02', bossId: 'ville' },
      { date: '2026-10-04', bossId: 'lien', reaction: 4 },
    ]
    expect(bossReactions(records, 'ville')).toEqual([0, 3])
  })
})

describe('traits : le chemin, pas les objectifs', () => {
  it('suggère pour Billy (chiot + craintif) Le Lien, La Nouveauté, La Ville en premier', () => {
    expect(featuredBosses(['chiot', 'craintif'])).toEqual(['lien', 'nouveaute', 'ville'])
    expect(suggestedBosses(['chiot', 'craintif'])).toHaveLength(10)
  })

  it('garde les 10 boss quel que soit le profil', () => {
    expect(suggestedBosses([])).toHaveLength(10)
    expect(featuredBosses([])).toEqual([])
    expect(new Set(suggestedBosses(['senior', 'reactif-chiens', 'energique'])).size).toBe(10)
  })

  it('additionne les garde-fous', () => {
    expect(guards(['chiot', 'craintif'])).toHaveLength(5)
    expect(guards([])).toEqual([])
  })

  it('met en avant les exercices des traits du chien', () => {
    expect(exercisesFor('lien', ['craintif'])[0]!.traits).toContain('craintif')
    expect(exercisesFor('rencontres', []).length).toBeGreaterThanOrEqual(2)
  })

  it('déconseille P4 à un chien craintif par mauvais temps, sans jamais verrouiller', () => {
    expect(levelFourUnadvised(['craintif'], 4, 'nuageux')).toBe(true)
    expect(levelFourUnadvised(['craintif'], 4, 'eclaircies')).toBe(false)
    expect(levelFourUnadvised(['craintif'], 3, 'averse')).toBe(false)
    expect(levelFourUnadvised(['chiot'], 4, 'averse')).toBe(false)
    expect(levelFourUnadvised(['craintif'], 4, undefined)).toBe(false)
  })
})

describe('séance conseillée', () => {
  const billy = ['chiot', 'craintif'] as const
  const done = (date: string, exerciseId: string, bossId: string, decision: 'monter' | 'rester' | 'baisser' = 'rester', difficulty = 1) => ({ date, exerciseId, bossId, difficulty, decision })

  it('commence par le premier boss conseillé et son premier exercice', () => {
    const advice = recommendSession([...billy], [])!
    expect([advice.bossId, advice.difficulty]).toEqual(['lien', 1])
    expect(advice.exercise.bossIds).toContain('lien')
    expect(sessionLink(advice)).toBe(`/seance?boss=lien&exercice=${advice.exercise.id}`)
  })

  it('tourne entre les boss conseillés après chaque séance', () => {
    expect(recommendSession([...billy], [done('2026-10-13', 'prenom', 'lien')])!.bossId).toBe('nouveaute')
    expect(recommendSession([...billy], [done('2026-10-13', 'prenom', 'lien'), done('2026-10-14', 'sons', 'nouveaute')])!.bossId).toBe('ville')
    expect(recommendSession([...billy], [done('2026-10-15', 'lat', 'ville')])!.bossId).toBe('lien')
    expect(recommendSession([...billy], [done('2026-10-15', 'tapis', 'calme')])!.bossId).toBe('lien')
  })

  it('propose l’exercice du boss pratiqué il y a le plus longtemps, les nouveaux d’abord', () => {
    const first = recommendSession([...billy], [])!.exercise.id
    const sessions = [done('2026-10-10', first, 'lien'), done('2026-10-12', 'lat', 'ville')]
    const next = recommendSession([...billy], sessions)!
    expect(next.bossId).toBe('lien')
    expect(next.exercise.id).not.toBe(first)
  })

  it('reprend la difficulté décidée la dernière fois', () => {
    const first = recommendSession([...billy], [])!.exercise
    const others = EXERCISES_FOR_LIEN.filter((id) => id !== first.id).map((id, i) => done(`2026-10-0${i + 1}`, id, 'lien'))
    const advice = recommendSession([...billy], [...others, done('2026-09-01', first.id, 'lien', 'monter', 2), done('2026-10-09', 'lat', 'ville')])!
    expect([advice.exercise.id, advice.difficulty]).toEqual([first.id, 3])
  })

  it('fonctionne sans aucun trait', () => {
    expect(recommendSession([], [])).toBeDefined()
  })
})
