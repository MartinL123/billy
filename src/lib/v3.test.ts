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
