import { describe, expect, it } from 'vitest'
import { levelTitle, SKILLS, skillText, stepPhrase, stepPhraseLower } from '../content/phrases'
import { BOSSES } from '../content/training'
import { isPuppy, questionnaireStatus, questionnaireSteps, statusLabel, stepsForAnswer } from './questionnaire'
import { acquiredSteps, lastSuccess } from './skills'

// Vocabulaire banni de l'interface (spec V3 § 1).
const BANNED = /\b(boss|palier|P[1-5]\b|N[1-5]\b|étoile|exposition|déclencheur|retraite stratégique|seuil|stats|rang|quête)/i

describe('phrases des étapes', () => {
  it('existent pour les 10 compétences et leurs 5 étapes', () => {
    expect(SKILLS).toHaveLength(10)
    for (const boss of BOSSES) {
      const text = skillText(boss.id)!
      expect(text.steps).toHaveLength(5)
      expect(new Set(text.steps).size).toBe(5)
      expect(text.question).toContain('{nom}')
    }
  })

  it('n’emploient aucun mot banni, ni chiffre technique, et restent courtes', () => {
    for (const boss of BOSSES) {
      const text = skillText(boss.id)!
      for (const phrase of [...text.steps, text.question, text.atHome, text.outside]) {
        expect(phrase, phrase).not.toMatch(BANNED)
        expect(phrase.split(' ').length, phrase).toBeLessThanOrEqual(12)
      }
    }
  })

  it('se lisent après « Billy » ou « Prochaine étape : »', () => {
    expect(stepPhrase('rappel', 1)).toBe('Revient quand on l’appelle d’une autre pièce')
    expect(stepPhraseLower('rappel', 3)).toBe('revient quand on l’appelle dans un parc calme')
    expect(stepPhraseLower('ville', 1)).toBe('écoute les bruits de la ville en mangeant')
  })

  it('rangent les compétences des bases vers le monde', () => {
    expect(SKILLS.map((s) => s.id)).toEqual(['lien', 'calme', 'soins', 'laisse', 'rappel', 'manieres', 'nouveaute', 'ville', 'rencontres', 'congeneres'])
  })
})

describe('titre selon le niveau', () => {
  it('suit les tranches de la spec', () => {
    expect([1, 2, 3, 4, 5, 7, 8, 10, 11, 14, 15, 40].map(levelTitle)).toEqual([
      'Chiot curieux', 'Chiot curieux', 'Apprenti', 'Apprenti', 'Explorateur', 'Explorateur',
      'Compagnon', 'Compagnon', 'Complice', 'Complice', 'Légende', 'Légende',
    ])
  })
})

describe('questionnaire de départ', () => {
  it('a 15 écrans pour un chien craintif, 14 sinon', () => {
    expect(questionnaireSteps(['craintif'])).toHaveLength(15)
    expect(questionnaireSteps([])).toHaveLength(14)
    expect(questionnaireSteps(['craintif']).slice(0, 4)).toEqual(['identite', 'caractere', 'peurs', 'lien'])
  })

  it('se reprend là où on s’était arrêté', () => {
    const status = questionnaireStatus({ answers: { identite: 'ok', caractere: 'ok', peurs: 'ok', lien: 'maison', calme: 'nsp', soins: 'non' } }, ['craintif'])
    expect(status).toMatchObject({ answered: 6, total: 15, complete: false, resumeAt: 6 })
    expect(statusLabel(status)).toBe('À compléter · 6 réponses sur 15')
    expect(statusLabel(questionnaireStatus(undefined, []))).toBe('À compléter · 14 questions')
  })

  it('est complété quand tout est répondu et terminé', () => {
    const answers = Object.fromEntries(questionnaireSteps([]).map((s) => [s, 'ok']))
    expect(questionnaireStatus({ answers }, []).complete).toBe(false)
    const done = questionnaireStatus({ answers, completedAt: '2026-10-13' }, [])
    expect(done.complete).toBe(true)
    expect(statusLabel(done)).toBe('Complété · revoir mes réponses')
  })

  it('traduit les réponses en étapes acquises avant l’app', () => {
    expect(['non', 'nsp', undefined, 'maison', 'dehors'].map(stepsForAnswer)).toEqual([0, 0, 0, 2, 3])
  })

  it('déduit « chiot » de la date de naissance', () => {
    expect(isPuppy('2026-05-13', '2026-10-13')).toBe(true)
    expect(isPuppy('2026-05-13', '2026-11-13')).toBe(false)
  })
})

describe('ce qu’il sait déjà faire', () => {
  const progress = {
    rappel: { level: 3, validations: [], masteryPlaces: [], preApp: [1, 2] },
    lien: { level: 1, validations: [], masteryPlaces: [] },
  }
  const log = [
    { id: 'palier-rappel-3', date: '2026-10-10', kind: 'palier' },
    { id: 'palier-rappel-1', date: '2026-10-13', kind: 'palier' },
    { id: 'palier-lien-1', date: '2026-10-12', kind: 'palier' },
  ]

  it('liste les étapes en phrases, la plus récente en haut, « avant l’app » à la fin', () => {
    const steps = acquiredSteps(progress, log)
    expect(steps.map((s) => [s.bossId, s.step, s.date])).toEqual([
      ['lien', 1, '2026-10-12'],
      ['rappel', 3, '2026-10-10'],
      ['rappel', 2, undefined],
      ['rappel', 1, undefined],
    ])
    expect(steps[0]!.phrase).toBe('Regarde quand on l’appelle, à la maison au calme')
  })

  it('donne la dernière réussite datée', () => {
    expect(lastSuccess(progress, log)).toMatchObject({ bossId: 'lien', step: 1 })
    expect(lastSuccess({}, [])).toBeUndefined()
  })
})

import { EMPTY_PROGRESS } from './bossProgress'
import { canAskStep, feelingOfReaction, momentBaseXp, previewMoment, tileOrder } from './moment'

describe('XP d’un moment raconté', () => {
  const calm = { fear: false, movedAway: false }

  it('donne 10 pour raconter, quel que soit le ressenti', () => {
    expect(momentBaseXp({ ...calm })).toBe(10)
    expect(momentBaseXp({ ...calm, feeling: 'difficile' })).toBe(10)
    expect(momentBaseXp({ ...calm, feeling: 'bien' })).toBe(10)
    expect(momentBaseXp({ ...calm, feeling: 'super' })).toBe(15)
  })

  it('récompense le fait de noter une peur et de s’éloigner, jamais de s’approcher', () => {
    expect(momentBaseXp({ feeling: 'difficile', fear: true, movedAway: false })).toBe(15)
    expect(momentBaseXp({ feeling: 'difficile', fear: true, movedAway: true })).toBe(23)
    expect(momentBaseXp({ feeling: 'bien', fear: false, movedAway: true })).toBe(10)
  })

  it('ne demande « c’est réussi ? » que si tout s’est bien passé', () => {
    expect(canAskStep({ ...calm })).toBe(true)
    expect(canAskStep({ ...calm, feeling: 'super' })).toBe(true)
    expect(canAskStep({ ...calm, feeling: 'difficile' })).toBe(false)
    expect(canAskStep({ feeling: 'bien', fear: true, movedAway: true })).toBe(false)
  })

  it('ajoute 10 par « oui » qui compte, et 50 quand l’étape est acquise', () => {
    const two = { ...EMPTY_PROGRESS, validations: [{ level: 1, date: '2026-10-10' }, { level: 1, date: '2026-10-11' }] }
    expect(previewMoment({ ...calm, feeling: 'bien' }, ['lien'], {}, '2026-10-13')).toEqual({ xp: 20, validated: ['lien'], steps: [] })
    expect(previewMoment({ ...calm, feeling: 'super' }, ['lien'], { lien: two }, '2026-10-13')).toEqual({ xp: 75, validated: ['lien'], steps: [{ bossId: 'lien', level: 1 }] })
  })

  it('ne compte pas deux « oui » le même jour, ni un « oui » un jour difficile', () => {
    const today = { ...EMPTY_PROGRESS, validations: [{ level: 1, date: '2026-10-13' }] }
    expect(previewMoment({ ...calm }, ['lien'], { lien: today }, '2026-10-13')).toEqual({ xp: 10, validated: [], steps: [] })
    expect(previewMoment({ ...calm, feeling: 'difficile' }, ['lien'], {}, '2026-10-13').xp).toBe(10)
  })

  it('compte un moment passé comme un moment du jour', () => {
    expect(previewMoment({ ...calm, feeling: 'super' }, ['rappel'], {}, '2026-09-20').xp).toBe(25)
  })
})

describe('tuiles des compétences', () => {
  it('suivent l’ordre des bases vers le monde quand rien n’a été raconté', () => {
    expect(tileOrder([])).toEqual(SKILLS.map((s) => s.id))
  })

  it('remontent les 3 compétences utilisées le plus récemment', () => {
    const order = tileOrder([
      { date: '2026-10-10', skills: ['ville'] },
      { date: '2026-10-12', skills: ['rappel', 'lien'] },
      { date: '2026-10-11', skills: ['calme'] },
      { date: '2026-10-01', skills: ['soins'] },
    ])
    expect(order.slice(0, 3)).toEqual(['rappel', 'lien', 'calme'])
    expect(order).toHaveLength(10)
    expect(new Set(order).size).toBe(10)
  })
})

describe('anciennes réactions', () => {
  it('se lisent comme un ressenti', () => {
    expect([0, 1, 2, 3, 4, undefined].map(feelingOfReaction)).toEqual(['super', 'bien', 'difficile', 'difficile', 'difficile', undefined])
  })
})

import { byRecency, exposureAsMoment, sessionAsMoment } from './carnet'

describe('Carnet unifié', () => {
  it('résume une ancienne séance sans chiffre ni vocabulaire interne', () => {
    const moment = sessionAsMoment({ id: 'a', date: '2026-10-13', exerciseId: 'prenom', bossId: 'lien', bossIds: ['lien', 'rappel'], reaction: 1 })
    expect(moment).toMatchObject({ id: 'seance-a', text: 'Exercice : Jeu du prénom.', skills: ['lien', 'rappel'], feeling: 'bien' })
    expect(moment.text).not.toMatch(BANNED)
  })

  it('présente une ancienne exposition comme une situation qui lui fait peur', () => {
    const moment = exposureAsMoment({ id: 'b', date: '2026-10-12', bossId: 'ville', trigger: 'La ruelle', reaction: 3, retreat: true })
    expect(moment).toMatchObject({ text: 'Une situation qui lui fait peur : La ruelle.', fear: true, movedAway: true, feeling: 'difficile', skills: ['ville'] })
    expect(moment.text).not.toMatch(BANNED)
  })

  it('range tout par date, le plus récent en haut', () => {
    const items = [{ date: '2026-10-10' }, { date: '2026-10-13', createdAt: 'a' }, { date: '2026-10-13', createdAt: 'b' }]
    expect([...items].sort(byRecency).map((i) => `${i.date}${i.createdAt ?? ''}`)).toEqual(['2026-10-13b', '2026-10-13a', '2026-10-10'])
  })
})

import { challengeProgress, weekChallenge } from './challenge'

describe('défi de la semaine', () => {
  it('est unique, sur une compétence conseillée, et change chaque semaine', () => {
    const a = weekChallenge('2026-10-12', ['chiot', 'craintif'])
    expect(a.target).toBe(3)
    expect(a.label).toMatch(/^Raconter 3 moments pour /)
    expect(a.label).not.toMatch(BANNED)
    expect(weekChallenge('2026-10-12', ['chiot', 'craintif'])).toEqual(a)
    expect(weekChallenge('2026-10-19', ['chiot', 'craintif']).bossId).not.toBe(a.bossId)
  })

  it('compte les moments de la semaine où la compétence est choisie', () => {
    const challenge = { bossId: 'lien', label: '', target: 3 }
    const moments = [
      { date: '2026-10-12', skills: ['lien'] },
      { date: '2026-10-13', skills: ['rappel', 'lien'] },
      { date: '2026-10-13', skills: ['ville'] },
      { date: '2026-10-13' },
      { date: '2026-10-05', skills: ['lien'] },
    ]
    expect(challengeProgress(challenge, '2026-10-13', moments, [])).toBe(2)
    expect(challengeProgress(challenge, '2026-10-13', moments, [{ date: '2026-10-14', bossId: 'rappel', bossIds: ['rappel', 'lien'] }])).toBe(3)
    expect(challengeProgress(challenge, '2026-10-13', [...moments, ...moments], [])).toBe(3)
  })
})

import { dominantFeeling, periodLabel, progressStory, workingOn } from './story'

describe('ses progrès en un mois', () => {
  const felt = (date: string, feeling: 'difficile' | 'bien' | 'super', skill = 'ville') => ({ date, feeling, skills: [skill] })

  it('nomme la période en mots', () => {
    expect(periodLabel('2026-09-27')).toBe('fin septembre')
    expect(periodLabel('2026-10-03')).toBe('début octobre')
    expect(periodLabel('2026-10-15')).toBe('mi-octobre')
  })

  it('prend le ressenti le plus fréquent', () => {
    expect(dominantFeeling(['difficile', 'difficile', 'bien'])).toBe('difficile')
    expect(dominantFeeling(['difficile', 'bien', 'super'])).toBe('bien')
  })

  it('compare les premiers moments aux derniers', () => {
    const moments = [felt('2026-09-25', 'difficile'), felt('2026-09-27', 'difficile'), felt('2026-10-08', 'bien'), felt('2026-10-12', 'bien')]
    const [story] = progressStory(moments, {}, [], '2026-10-13')
    expect(story).toMatchObject({ bossId: 'ville', since: 'fin septembre', before: 'souvent difficile', now: 'plutôt bien', better: true })
  })

  it('ne met jamais en avant un « moins bien », et attend assez de moments', () => {
    const worse = [felt('2026-09-25', 'super'), felt('2026-09-27', 'super'), felt('2026-10-08', 'difficile'), felt('2026-10-12', 'difficile')]
    expect(progressStory(worse, {}, [], '2026-10-13')).toEqual([])
    expect(progressStory(worse.slice(0, 3), {}, [], '2026-10-13')).toEqual([])
  })

  it('montre une étape gagnée depuis un mois, sans compter celles d’avant l’app', () => {
    const progress = { rappel: { level: 3, validations: [], masteryPlaces: [], preApp: [1, 2] } }
    const log = [
      { id: 'palier-rappel-1', date: '2026-10-01', kind: 'palier' },
      { id: 'palier-rappel-2', date: '2026-10-01', kind: 'palier' },
      { id: 'palier-rappel-3', date: '2026-10-10', kind: 'palier' },
    ]
    const [story] = progressStory([], progress, log, '2026-10-13')
    expect(story).toMatchObject({ bossId: 'rappel', before: stepPhraseLower('rappel', 2), now: stepPhraseLower('rappel', 3), better: true })
    expect(progressStory([], { rappel: { ...progress.rappel, preApp: [1, 2, 3] } }, log, '2026-10-13')).toEqual([])
  })

  it('n’utilise aucun mot banni et au plus 3 comparaisons', () => {
    const moments = SKILLS.flatMap((s) => [felt('2026-09-25', 'bien', s.id), felt('2026-09-26', 'bien', s.id), felt('2026-10-10', 'super', s.id), felt('2026-10-11', 'super', s.id)])
    const stories = progressStory(moments, {}, [], '2026-10-13')
    expect(stories).toHaveLength(3)
    for (const s of stories) expect(`${s.name} ${s.before} ${s.now}`).not.toMatch(BANNED)
  })

  it('« on travaille en ce moment » : les plus récentes, puis les conseillées, 3 au plus, jamais une compétence finie', () => {
    const moments = [{ date: '2026-10-12', skills: ['ville'] }, { date: '2026-10-13', skills: ['rappel'] }]
    expect(workingOn(moments, ['lien', 'calme', 'soins'], {}, 5)).toEqual(['rappel', 'ville', 'lien'])
    expect(workingOn(moments, ['lien', 'calme'], { rappel: { level: 5, validations: [], masteryPlaces: [] } }, 5)).toEqual(['ville', 'lien', 'calme'])
  })
})

import { EXERCISES } from '../content/training'

describe('textes des exercices', () => {
  it('n’utilisent aucun mot banni', () => {
    for (const exercise of EXERCISES) {
      expect([exercise.name, ...exercise.steps, ...exercise.levels, exercise.caution ?? ''].join(' ')).not.toMatch(BANNED)
    }
  })
})
