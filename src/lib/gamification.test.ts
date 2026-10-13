import { describe, expect, it } from 'vitest'
import { badges, fearToWork, GAMES, gameOfTheDay, levelInfo, longestStreak, missionsDone, recommendExercises, totalXp, weekOf, xpByDay, xpForLevel } from './gamification'

type Result = 'difficile' | 'moyen' | 'reussi'
const session = (date: string, exerciseId: string, result: Result = 'reussi') => ({ date, exerciseId, result })
const game = (date: string, id = 'cache-cache') => session(date, `jeu-${id}`)
const exposure = (date: string, trigger: string, fear: number) => ({ date, trigger, fear })
const xp = (sessions: ReturnType<typeof session>[], exposures: ReturnType<typeof exposure>[] = []) => totalXp(xpByDay(sessions, exposures))

describe('expérience', () => {
  it('récompense l’effort, même quand c’est difficile', () => {
    // séance + mission « exercice »
    expect(xp([session('2026-10-13', 'assis', 'difficile')])).toBe(10 + 10)
    expect(xp([session('2026-10-13', 'assis', 'moyen')])).toBe(15 + 10)
    expect(xp([session('2026-10-13', 'assis', 'reussi')])).toBe(20 + 10)
  })

  it('compte une chose à mâcher sans en faire une mission', () => {
    expect(xp([session('2026-10-13', 'macher-carotte')])).toBe(10)
    expect(missionsDone([session('2026-10-13', 'macher-carotte')], [], '2026-10-13')).toEqual({ exercise: false, game: false, challenge: false })
  })

  it('compte les jeux et les expositions', () => {
    expect(xp([game('2026-10-13')])).toBe(15 + 10)
    expect(xp([], [exposure('2026-10-13', 'La ruelle', 4)])).toBe(15 + 10)
  })

  it('donne un bonus quand une peur baisse', () => {
    const total = xp([], [exposure('2026-10-01', 'La ruelle', 4), exposure('2026-10-05', 'la ruelle', 3), exposure('2026-10-08', 'La ruelle', 3)])
    expect(total).toBe(3 * (15 + 10) + 10)
  })

  it('donne le bonus « acquis » une seule fois, à la 3e réussite d’affilée', () => {
    const three = [session('2026-10-01', 'assis'), session('2026-10-02', 'assis'), session('2026-10-03', 'assis')]
    expect(xp(three)).toBe(3 * 30 + 50)
    const relapse = [...three, session('2026-10-04', 'assis', 'difficile'), session('2026-10-05', 'assis'), session('2026-10-06', 'assis'), session('2026-10-07', 'assis')]
    expect(xp(relapse)).toBe(xp(three) + 20 + 3 * 30)
  })

  it('récompense la journée parfaite', () => {
    const day = '2026-10-13'
    expect(xp([session(day, 'assis'), game(day)], [exposure(day, 'La ruelle', 3)])).toBe(20 + 15 + 15 + 3 * 10 + 20)
    expect(xp([session(day, 'assis'), session(day, 'rappel'), game(day)])).toBe(20 + 20 + 15 + 3 * 10 + 20)
  })
})

describe('missions', () => {
  it('distingue exercice, jeu et défi', () => {
    const day = '2026-10-13'
    expect(missionsDone([session(day, 'assis')], [], day)).toEqual({ exercise: true, game: false, challenge: false })
    expect(missionsDone([session(day, 'assis'), session(day, 'assis')], [], day).challenge).toBe(false)
    expect(missionsDone([session(day, 'assis'), session(day, 'rappel')], [], day).challenge).toBe(true)
    expect(missionsDone([game(day)], [exposure(day, 'Les enfants', 2)], day)).toEqual({ exercise: false, game: true, challenge: true })
    expect(missionsDone([session('2026-10-12', 'assis')], [], day)).toEqual({ exercise: false, game: false, challenge: false })
  })
})

describe('niveaux', () => {
  it('demande de plus en plus d’expérience', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 250, 450, 700])
  })

  it('situe l’expérience dans le niveau', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, title: 'Chiot curieux', current: 0, needed: 100, nextTitle: 'Apprenti' })
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100)).toMatchObject({ level: 2, current: 0, needed: 150 })
    expect(levelInfo(320)).toMatchObject({ level: 3, title: 'Élève attentif', current: 70, needed: 200 })
    expect(levelInfo(1_000_000).title).toBe('Légende du quartier')
  })
})

describe('séries et semaine', () => {
  it('trouve la plus longue série', () => {
    expect(longestStreak([])).toBe(0)
    expect(longestStreak(['2026-10-01', '2026-10-02', '2026-10-02', '2026-10-03', '2026-10-07', '2026-10-08'])).toBe(3)
    expect(longestStreak(['2026-09-30', '2026-10-01'])).toBe(2)
  })

  it('donne la semaine du lundi au dimanche', () => {
    expect(weekOf('2026-10-13')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'])
    expect(weekOf('2026-10-18')[0]).toBe('2026-10-12')
    expect(weekOf('2026-10-12')[0]).toBe('2026-10-12')
  })
})

describe('recommandations', () => {
  it('propose d’abord le premier exercice du programme', () => {
    const [first] = recommendExercises([], '2026-10-13')
    expect([first!.exercise.id, first!.reason]).toEqual(['nom', 'Nouveau à découvrir'])
  })

  it('garde les ordres « plus tard » pour après les bases', () => {
    const ids = recommendExercises([], '2026-10-13').map((r) => r.exercise.id)
    expect(ids).not.toContain('traverse')
    const ready = ['pas-bouger', 'laisse'].flatMap((id) => [1, 2, 3].map((d) => session(`2026-10-0${d}`, id)))
    expect(recommendExercises(ready, '2026-10-13').map((r) => r.exercise.id)).toContain('traverse')
  })

  it('priorise l’exercice en cours le plus délaissé', () => {
    const sessions = [session('2026-10-05', 'rappel', 'moyen'), session('2026-10-12', 'assis', 'moyen')]
    const [first, second] = recommendExercises(sessions, '2026-10-13')
    expect([first!.exercise.id, first!.reason]).toEqual(['rappel', 'Pas travaillé depuis 8 jours'])
    expect([second!.exercise.id, second!.reason]).toEqual(['assis', 'Travaillé hier'])
  })

  it('fait passer en premier un ordre qui se dégrade', () => {
    const declining = (['reussi', 'reussi', 'reussi', 'moyen', 'difficile', 'moyen'] as const).map((r, i) => session(`2026-10-0${i + 4}`, 'rappel', r))
    const [first] = recommendExercises([session('2026-09-20', 'assis', 'moyen'), ...declining], '2026-10-13')
    expect([first!.exercise.id, first!.reason]).toEqual(['rappel', 'En baisse ces derniers temps'])
  })

  it('ne change pas pendant la journée', () => {
    const before = recommendExercises([session('2026-10-12', 'assis', 'moyen')], '2026-10-13')[0]!.exercise.id
    const after = recommendExercises([session('2026-10-12', 'assis', 'moyen'), session('2026-10-13', 'assis')], '2026-10-13')[0]!.exercise.id
    expect(after).toBe(before)
  })

  it('adapte le conseil aux dernières séances', () => {
    const hard = recommendExercises([session('2026-10-10', 'rappel', 'difficile'), session('2026-10-11', 'rappel', 'difficile')], '2026-10-13')[0]!
    expect(hard.advice).toContain('Deux séances difficiles')
    const close = recommendExercises([session('2026-10-10', 'rappel'), session('2026-10-11', 'rappel')], '2026-10-13')[0]!
    expect(close.advice).toContain('acquis')
  })

  it('choisit un jeu du jour stable et une peur prioritaire', () => {
    expect(gameOfTheDay('2026-10-13')).toBe(gameOfTheDay('2026-10-13'))
    expect(gameOfTheDay('2026-10-14')).not.toBe(gameOfTheDay('2026-10-13'))
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length)
    expect(fearToWork([exposure('2026-10-01', 'La ruelle', 4), exposure('2026-10-08', 'La ruelle', 2), exposure('2026-10-05', 'Les enfants', 3)])).toBe('Les enfants')
    expect(fearToWork([exposure('2026-10-01', 'La ruelle', 1)])).toBeUndefined()
  })
})

describe('succès', () => {
  const earned = (...args: Parameters<typeof badges>) => badges(...args).filter((b) => b.earned).map((b) => b.id)

  it('ne donne rien au départ', () => {
    expect(earned([], [], 0)).toEqual([])
  })

  it('débloque au fil des progrès', () => {
    const sessions = [session('2026-10-01', 'assis'), session('2026-10-02', 'assis'), session('2026-10-03', 'assis'), game('2026-10-03')]
    const exposures = [exposure('2026-10-01', 'La ruelle', 5), exposure('2026-10-03', 'La ruelle', 3)]
    expect(earned(sessions, exposures, 700)).toEqual(['premiere', 'serie-3', 'parfaite', 'acquis-1', 'courage', 'niveau-5'])
  })
})
