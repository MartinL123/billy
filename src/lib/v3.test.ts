import { describe, expect, it } from 'vitest'
import { SKILLS, skillText, stepPhrase, stepPhraseLower } from '../content/phrases'
import { BOSSES } from '../content/training'
import { deriveTraits, fearSkills, isPuppy, PARTS, questionnaireStatus, reactionSentence, reactionsFromFears, situationSkill, skillOptions, statusLabel, STEPS, stepsForAnswer } from './questionnaire'
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

describe('questionnaire de départ', () => {
  it('suit les 5 parties dans l’ordre, une question par écran', () => {
    expect(PARTS).toHaveLength(5)
    expect(STEPS.map((s) => s.part)).toEqual([...STEPS.map((s) => s.part)].sort())
    expect(STEPS[0]!.id).toBe('nom')
    expect(STEPS.at(-1)!.id).toBe('fin')
    expect(STEPS.filter((s) => s.kind === 'skill').map((s) => s.id)).toEqual(SKILLS.map((s) => s.id))
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length)
    for (const step of STEPS) expect(`${step.title} ${step.help ?? ''}`).not.toMatch(BANNED)
  })

  it('se reprend là où on s’était arrêté', () => {
    const status = questionnaireStatus({ answers: { nom: 'ok', photo: 'ok', naissance: 'ok' } })
    expect(status).toMatchObject({ answered: 3, total: STEPS.length, complete: false, resumeAt: 3 })
    expect(statusLabel(status)).toBe(`À compléter · 3 réponses sur ${STEPS.length}`)
    expect(statusLabel(questionnaireStatus(undefined))).toBe(`À compléter · ${STEPS.length} questions`)
  })

  it('garde les réponses de l’ancien questionnaire quand elles ont un équivalent', () => {
    const status = questionnaireStatus({ answers: { identite: 'ok', caractere: 'ok', lien: 'maison', rappel: 'dehors' }, completedAt: '2026-10-13' })
    // nom, naissance, race, adoption + les deux compétences ; l'ancien « terminé » ne suffit plus.
    expect(status.answered).toBe(6)
    expect(status.complete).toBe(false)
    expect(STEPS[status.resumeAt]!.id).toBe('photo')
  })

  it('est complété quand tout est répondu et terminé', () => {
    const answers = Object.fromEntries(STEPS.map((s) => [s.id, 'ok']))
    expect(questionnaireStatus({ answers }).complete).toBe(false)
    const done = questionnaireStatus({ answers, completedAt: '2026-10-13' })
    expect(done.complete).toBe(true)
    expect(statusLabel(done)).toBe('Complété · revoir mes réponses')
  })

  it('traduit les réponses en étapes acquises : un chien déjà éduqué peut tout avoir', () => {
    expect(['non', 'nsp', undefined, 'maison', 'dehors', 'anime', 'partout'].map(stepsForAnswer)).toEqual([0, 0, 0, 2, 3, 4, 5])
    expect(skillOptions('lien').map((o) => o.label)).toEqual(['Pas encore', 'À la maison', 'Même dehors'])
    expect(skillOptions('ville').map((o) => o.label)).toEqual(['Pas encore', 'Dans une rue calme', 'Même en rue animée'])
    expect(skillOptions('congeneres').map((o) => o.label)).toEqual(['Pas encore', 'De loin', 'Même de près'])
  })

  it('relie chaque situation à sa compétence et écrit la phrase', () => {
    expect(situationSkill('il croise des enfants')).toBe('rencontres')
    expect(situationSkill('il passe dans une rue étroite')).toBe('ville')
    expect(situationSkill('il voit son reflet')).toBe('nouveaute')
    expect(situationSkill('autre chose')).toBeUndefined()
    expect(reactionSentence({ situation: 'il croise des enfants', reaction: 'peur' })).toBe('Quand il croise des enfants, il a peur.')
    expect(reactionSentence({ situation: 'il reste seul', reaction: 'agité' })).toBe('Quand il reste seul, il est agité.')
  })

  it('reprend les anciennes peurs en phrases à confirmer', () => {
    expect(reactionsFromFears(['Les enfants', 'Les rues étroites', 'Son reflet', 'Inconnu au bataillon'])).toEqual([
      { situation: 'il croise des enfants', reaction: 'peur', bossId: 'rencontres' },
      { situation: 'il passe dans une rue étroite', reaction: 'peur', bossId: 'ville' },
      { situation: 'il voit son reflet', reaction: 'peur', bossId: 'nouveaute' },
    ])
  })

  it('déduit le caractère au lieu de le demander', () => {
    const fears = reactionsFromFears(['Les enfants', 'Son reflet'])
    expect(deriveTraits([], fears, 'Calme', '2026-05-13', '2026-10-13')).toEqual(['chiot', 'craintif'])
    expect(deriveTraits([], fears.slice(0, 1), 'Très excité', '2024-05-13', '2026-10-13')).toEqual(['energique'])
    expect(deriveTraits(['adopte-adulte', 'energique'], [{ situation: 'il croise un autre chien', reaction: 'peur', bossId: 'congeneres' }], undefined, '2017-01-01', '2026-10-13')).toEqual(['reactif-chiens', 'senior', 'adopte-adulte'])
    expect(fearSkills(fears)).toEqual(['rencontres', 'nouveaute'])
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
import { addDays } from './dates'

describe('défi de la semaine', () => {
  it('est unique, toujours sûr, et change chaque semaine', () => {
    const a = weekChallenge('2026-10-12')
    expect(a.target).toBe(3)
    expect(a.label).toMatch(/^3 fois « .+ » cette semaine$/)
    expect(a.label).not.toMatch(BANNED)
    expect(weekChallenge('2026-10-12')).toEqual(a)
    expect(weekChallenge('2026-10-19').bossId).not.toBe(a.bossId)
    // Jamais une compétence de peur, quelle que soit la semaine.
    for (let i = 0; i < 30; i++) expect(['lien', 'calme', 'manieres']).toContain(weekChallenge(addDays('2026-10-12', 7 * i)).bossId)
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

import { modernCard } from './carnet'

describe('anciennes cartes de réussite', () => {
  it('s’affichent avec les mots d’aujourd’hui, sans toucher aux autres souvenirs', () => {
    const old = { text: 'Palier acquis : Le Rappel, P2 « Mobile ».\nRevient en lâchant un jouet.', tags: ['Dressage'] }
    const shown = modernCard(old)
    expect(shown.text).toBe(`C'est réussi ! ${stepPhrase('rappel', 2)}.`)
    expect(shown.tags).toEqual(['Réussite'])
    expect(`${shown.text} ${shown.tags.join(' ')}`).not.toMatch(BANNED)
    for (const label of ['Première séance', 'Première exposition notée', 'Première retraite stratégique', 'Premier palier acquis', 'Premier palier « Dehors au calme »', 'Première étoile de maîtrise', 'Un déclencheur croisé en restant détendu', 'Trois boss travaillés', 'Cinq réussites sur cinq']) {
      expect(modernCard({ text: `Première fois : ${label}.`, tags: ['Dressage'] }).text).not.toMatch(BANNED)
    }
    const plain = { text: 'Balade au parc.', tags: ['Balade'] }
    expect(modernCard(plain)).toBe(plain)
  })
})

import { FEAR_SKILLS, stepShort, TERRITORIES } from '../content/phrases'
import { exerciseById, STEP_EXERCISES } from '../content/training'
import { currentExercise, exercisesForStep, longSessionsDate, sessionMinutes } from './training-plan'

describe('arbre de compétences : étape → exercices', () => {
  it('chaque étape de chaque compétence a au moins un exercice du catalogue, avec un réglage de 1 à 5', () => {
    expect(Object.keys(STEP_EXERCISES).sort()).toEqual(BOSSES.map((b) => b.id).sort())
    for (const boss of BOSSES) {
      expect(STEP_EXERCISES[boss.id]).toHaveLength(5)
      for (const step of STEP_EXERCISES[boss.id]!) {
        expect(step.length).toBeGreaterThan(0)
        for (const { id, level } of step) {
          const exercise = exerciseById(id)
          expect(exercise, id).toBeDefined()
          expect(exercise!.bossIds, `${id} pour ${boss.id}`).toContain(boss.id)
          expect(level).toBeGreaterThanOrEqual(1)
          expect(level).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it('contient les 6 nouveaux exercices', () => {
    for (const id of ['absences', 'visite-veto', 'assis-couche', 'porte', 'quatre-pattes', 'parcours-objets']) expect(exerciseById(id), id).toBeDefined()
  })

  it('donne l’exercice de l’étape en cours, au bon réglage', () => {
    expect(currentExercise('lien', 0)).toMatchObject({ level: 1, setting: 'Salon, à 1 m' })
    expect(currentExercise('lien', 0)!.exercise.id).toBe('prenom')
    expect(exercisesForStep('rappel', 2).map((e) => `${e.exercise.id}:${e.level}`)).toEqual(['rappel-ping-pong:4'])
    // Compétence maîtrisée : on révise la dernière étape.
    expect(exercisesForStep('rappel', 5)).toEqual(exercisesForStep('rappel', 4))
  })

  it('ne rapproche jamais de ce qui fait peur : pas de réglage « en situation réelle » pour les compétences de peur', () => {
    for (const id of FEAR_SKILLS) {
      for (const step of [0, 1, 2, 3, 4]) {
        for (const planned of exercisesForStep(id, step)) expect(planned.setting).not.toMatch(/situation réelle|En croisant un chien/)
      }
    }
  })

  it('a une phrase courte par étape, sans mot banni, et 3 étages', () => {
    for (const boss of BOSSES) for (const step of [1, 2, 3, 4, 5]) {
      const short = stepShort(boss.id, step)
      expect(short.split(' ').length).toBeLessThanOrEqual(9)
      expect(short).not.toMatch(BANNED)
    }
    expect(TERRITORIES.map((t) => t.name)).toEqual(['La Maison', 'Le Quartier', 'Le Grand Monde'])
  })
})

describe('durée des séances', () => {
  it('3 minutes avant 6 mois, 5 minutes ensuite, depuis la date de naissance', () => {
    expect(sessionMinutes('2026-05-13', '2026-10-13')).toBe(3)
    expect(sessionMinutes('2026-05-13', '2026-11-12')).toBe(3)
    expect(sessionMinutes('2026-05-13', '2026-11-13')).toBe(5)
    expect(sessionMinutes('2020-01-01', '2026-10-13')).toBe(5)
    expect(longSessionsDate('2026-05-13')).toBe('2026-11-13')
  })
})

import { activeSkills, skillHints, toggleActive } from './active'
import { isFearMoment } from './moment'
import { dailyQuest, MAX_SKIPS, questMission, questNote } from './quest'

describe('compétences en cours', () => {
  const done = { level: 5, validations: [], masteryPlaces: [] }

  it('propose les 3 premières non maîtrisées quand le maître n’a rien choisi', () => {
    expect(activeSkills(undefined, ['chiot', 'craintif'], {})).toHaveLength(3)
    expect(activeSkills(undefined, [], { lien: done })).toEqual(['calme', 'soins', 'laisse'])
  })

  it('garde le choix du maître, 3 au plus, sans les compétences maîtrisées', () => {
    expect(activeSkills(['rappel', 'ville'], [], {})).toEqual(['rappel', 'ville'])
    expect(activeSkills(['rappel', 'ville', 'lien', 'calme'], [], { ville: done })).toEqual(['rappel', 'lien', 'calme'])
    expect(activeSkills([], ['chiot'], {})).toEqual([])
  })

  it('refuse une 4e compétence tant qu’on n’en a pas décoché une', () => {
    expect(toggleActive(['a', 'b', 'c'], 'd')).toEqual({ chosen: ['a', 'b', 'c'], refused: true })
    expect(toggleActive(['a', 'b', 'c'], 'b')).toEqual({ chosen: ['a', 'c'], refused: false })
    expect(toggleActive(['a'], 'b')).toEqual({ chosen: ['a', 'b'], refused: false })
  })

  it('indique « Tout doux » sur une peur déclarée et « Conseillé » avant une visite véto', () => {
    const hints = skillHints(['Les enfants', 'Les rues étroites', 'Son reflet'], [], [{ type: 'veto', date: '2026-10-20', done: false }], '2026-10-13')
    expect(hints.rencontres).toEqual({ kind: 'doux', text: 'Tout doux : il a peur des enfants' })
    expect(hints.ville?.text).toBe('Tout doux : il se bloque dans les rues étroites')
    expect(hints.nouveaute?.kind).toBe('doux')
    expect(hints.soins?.text).toMatch(/^Conseillé : utile avant sa prochaine visite/)
    expect(skillHints([], [], [{ type: 'veto', date: '2026-12-25', done: false }], '2026-10-13').soins?.text ?? '').not.toMatch(/visite/)
  })
})

describe('quête du jour', () => {
  const base = { today: '2026-10-13', active: ['lien', 'rappel', 'ville'], progress: {}, moments: [], rests: [] }

  it('propose un exercice d’une compétence en cours, à l’étape en cours', () => {
    const quest = dailyQuest(base)
    expect(quest.kind).toBe('exercice')
    expect(base.active).toContain(quest.bossId)
    expect(quest.planned!.exercise.bossIds).toContain(quest.bossId)
    expect(dailyQuest(base)).toEqual(quest)
    const mission = questMission(quest, 3)
    expect(mission.detail).toMatch(/^3 minutes · /)
    expect(`${mission.title} ${mission.detail} ${questNote(quest, 3)}`).not.toMatch(BANNED)
  })

  it('le lendemain d’un moment « Difficile », c’est toujours une journée de repos, même avec « Autre idée »', () => {
    const hard = { ...base, moments: [{ date: '2026-10-12', feeling: 'difficile' }] }
    for (let skips = 0; skips <= MAX_SKIPS; skips++) expect(dailyQuest(hard, skips)).toMatchObject({ kind: 'repos', afterHardDay: true })
    expect(dailyQuest({ ...base, moments: [{ date: '2026-10-11', feeling: 'difficile' }] }).kind).not.toBe('repos')
  })

  it('propose un jour de repos le dimanche, sauf si la semaine en a déjà eu un', () => {
    expect(dailyQuest({ ...base, today: '2026-10-18' }).kind).toBe('repos')
    expect(dailyQuest({ ...base, today: '2026-10-18', rests: ['2026-10-14'] }).kind).not.toBe('repos')
  })

  it('« Autre idée » change de proposition', () => {
    expect(dailyQuest(base, 1)).not.toEqual(dailyQuest(base, 0))
  })

  it('révise de temps en temps une compétence maîtrisée, jamais une compétence hors liste autrement', () => {
    const progress = { calme: { level: 5, validations: [], masteryPlaces: [] } }
    const kinds = new Map<string, Set<string | undefined>>()
    for (let i = 0; i < 20; i++) {
      const quest = dailyQuest({ ...base, today: addDays('2026-10-12', i), progress, rests: ['2026-10-12', '2026-10-19', '2026-10-26'] })
      kinds.set(quest.kind, (kinds.get(quest.kind) ?? new Set()).add(quest.bossId))
    }
    expect([...kinds.get('revision')!]).toEqual(['calme'])
    for (const id of kinds.get('exercice')!) expect(base.active).toContain(id)
  })

  it('sans compétence en cours ni maîtrisée, propose du repos plutôt que rien', () => {
    expect(dailyQuest({ ...base, active: [] }).kind).toBe('repos')
  })
})

describe('situation de peur', () => {
  it('se déduit du ressenti « Difficile » et d’une compétence de peur', () => {
    expect(isFearMoment('difficile', ['ville'])).toBe(true)
    expect(isFearMoment('difficile', ['lien'])).toBe(false)
    expect(isFearMoment('bien', ['ville'])).toBe(false)
    expect(isFearMoment(undefined, ['ville'])).toBe(false)
  })
})

import { notedDays, programWeek } from './rhythm'

describe('son programme : la semaine en 7 pastilles', () => {
  it('coche le bon jour : un moment noté le lundi 12 octobre coche lundi, pas un autre jour', () => {
    const week = programWeek('2026-10-13', notedDays([{ id: 'a', date: '2026-10-12' }]), [])
    expect(week.map((d) => d.letter).join('')).toBe('LMMJVSD')
    expect(week[0]).toMatchObject({ date: '2026-10-12', state: 'fait', today: false })
    expect(week[1]).toMatchObject({ date: '2026-10-13', state: 'attente', today: true })
    expect(week.slice(2).every((d) => d.state === 'attente' && !d.today)).toBe(true)
  })

  it('compte les moments, les exercices et les anciennes situations, sans doublon', () => {
    expect(notedDays([{ id: 'a', date: '2026-10-12' }], [{ date: '2026-10-12' }], [{ date: '2026-10-14' }]).sort()).toEqual(['2026-10-12', '2026-10-14'])
  })

  it('jour de repos + aujourd’hui : la lune garde le contour d’aujourd’hui', () => {
    // La carte « Jour de repos » écrite par l'app ne compte pas comme un moment noté.
    const noted = notedDays([{ id: 'repos-2026-10-13', date: '2026-10-13' }])
    const today = programWeek('2026-10-13', noted, ['2026-10-13'])[1]!
    expect(today).toMatchObject({ state: 'repos', today: true })
  })

  it('un jour de repos où l’on a aussi noté un moment est coché ; un jour vide n’est jamais « raté »', () => {
    const week = programWeek('2026-10-15', notedDays([{ id: 'a', date: '2026-10-13' }]), ['2026-10-13', '2026-10-14'])
    expect(week.map((d) => d.state)).toEqual(['attente', 'fait', 'repos', 'attente', 'attente', 'attente', 'attente'])
    expect(week[3]!.today).toBe(true)
  })
})
import { canUncheck, markPreApp, uncheckPreApp, xpWithout } from './bossProgress'
import { answerForSteps } from './questionnaire'
import { globalLevel } from './xp'

describe('corriger ce qu’il savait déjà faire', () => {
  const pre = (level: number, preApp: number[]) => ({ level, validations: [], masteryPlaces: [], preApp })

  it('décocher une étape décoche aussi les plus difficiles', () => {
    const { progress, removed } = uncheckPreApp(pre(4, [1, 2, 3, 4]), 2)
    expect(removed).toEqual([2, 3, 4])
    expect(progress).toMatchObject({ level: 1, preApp: [1] })
    expect(uncheckPreApp(pre(3, [1, 2, 3]), 3)).toMatchObject({ removed: [3], progress: { level: 2, preApp: [1, 2] } })
  })

  it('cocher une étape coche aussi les plus faciles', () => {
    const { progress, gained } = markPreApp(pre(1, [1]), 4)
    expect(gained).toEqual([2, 3, 4])
    expect(progress).toMatchObject({ level: 4, preApp: [1, 2, 3, 4] })
  })

  it('ne décoche jamais une étape validée dans l’app, ni une étape située sous elle', () => {
    // Étapes 1 et 2 déclarées, étape 3 gagnée par la pratique.
    const mixed = pre(3, [1, 2])
    expect(canUncheck(mixed, 3)).toBe(false)
    expect(canUncheck(mixed, 2)).toBe(false)
    expect(canUncheck(mixed, 1)).toBe(false)
    expect(uncheckPreApp(mixed, 2)).toEqual({ progress: mixed, removed: [] })
    // Une étape pas encore acquise n'a rien à décocher.
    expect(canUncheck(pre(2, [1, 2]), 3)).toBe(false)
    expect(canUncheck({ level: 2, validations: [], masteryPlaces: [] }, 2)).toBe(false)
  })

  it('recalcule le niveau sans toucher au reste de l’XP', () => {
    const log = [
      { id: 'palier-soins-1', xp: 50 },
      { id: 'palier-soins-2', xp: 50 },
      { id: 'palier-soins-3', xp: 50 },
      { id: 'palier-lien-1', xp: 50 },
      { id: 'moment-a', xp: 25 },
    ]
    expect(globalLevel(xpWithout(log, 'soins', [])).level).toBe(3)
    expect(xpWithout(log, 'soins', [2, 3])).toBe(125)
    expect(globalLevel(xpWithout(log, 'soins', [2, 3])).level).toBe(2)
  })

  it('met la réponse du questionnaire en accord avec les étapes cochées', () => {
    expect([0, 1, 2, 3, 4, 5].map(answerForSteps)).toEqual(['non', 'non', 'maison', 'dehors', 'anime', 'partout'])
    for (const n of [0, 2, 3, 4, 5]) expect(stepsForAnswer(answerForSteps(n))).toBe(n)
  })
})

import { addValidation, checkStep, remaining, uncheckStep } from './bossProgress'

describe('cocher ou décocher une étape depuis le chemin', () => {
  const practiced = {
    level: 3,
    validations: [1, 2, 3].flatMap((level) => ['2026-10-01', '2026-10-02', '2026-10-03'].map((date) => ({ level, date }))),
    masteryPlaces: [],
    preApp: [1],
  }

  it('décocher décoche aussi les étapes plus difficiles, même validées dans l’app', () => {
    const { progress, removed } = uncheckStep(practiced, 2)
    expect(removed).toEqual([2, 3])
    expect(progress.level).toBe(1)
    expect(progress.preApp).toEqual([1])
    // L'étape redevient l'étape en cours, à refaire 3 fois.
    expect(remaining(progress)).toMatchObject({ target: 2, done: 0, needed: 3 })
    expect(addValidation(progress, '2026-10-13').levelGained).toBeUndefined()
    expect(uncheckStep(practiced, 4)).toEqual({ progress: practiced, removed: [] })
  })

  it('cocher coche aussi les plus faciles, marquées « il savait déjà le faire »', () => {
    const { progress, gained } = checkStep({ level: 1, validations: [], masteryPlaces: [], preApp: [1] }, 3)
    expect(gained).toEqual([2, 3])
    expect(progress).toMatchObject({ level: 3, preApp: [1, 2, 3] })
  })

  it('ne touche jamais à l’XP : le journal n’entre pas dans le calcul', () => {
    const log = [{ id: 'palier-rappel-2', xp: 50 }, { id: 'palier-rappel-3', xp: 50 }, { id: 'm', xp: 10 }]
    const before = log.reduce((sum, e) => sum + e.xp, 0)
    uncheckStep(practiced, 2)
    checkStep(practiced, 5)
    expect(log.reduce((sum, e) => sum + e.xp, 0)).toBe(before)
    expect(globalLevel(before).level).toBe(globalLevel(log.reduce((sum, e) => sum + e.xp, 0)).level)
  })

  it('« Annuler » retrouve exactement l’état d’avant', () => {
    const snapshot = JSON.parse(JSON.stringify(practiced))
    uncheckStep(practiced, 1)
    checkStep(practiced, 5)
    // Les fonctions ne modifient pas l'état d'origine : annuler, c'est le réécrire tel quel.
    expect(practiced).toEqual(snapshot)
  })
})

import { neededTreats } from './training-plan'

describe('une seule formulation par étape', () => {
  const words = (text: string) => text.toLocaleLowerCase('fr').replace(/[’',.«»]/g, ' ').split(/\s+/).filter((w) => w.length >= 4)

  it('la phrase courte d’un badge n’utilise que des mots de la phrase complète', () => {
    for (const skill of SKILLS) {
      for (const step of [1, 2, 3, 4, 5]) {
        const full = words(stepPhrase(skill.id, step))
        for (const word of words(stepShort(skill.id, step))) expect(full, `${skill.id} ${step} : « ${word} »`).toContain(word)
      }
    }
  })

  it('la phrase courte commence comme la phrase complète', () => {
    for (const skill of SKILLS) for (const step of [1, 2, 3, 4, 5]) expect(stepShort(skill.id, step).split(' ')[0]).toBe(stepPhrase(skill.id, step).split(' ')[0])
  })
})

describe('vouvoiement dans les exercices', () => {
  it('aucun texte d’exercice ne tutoie', () => {
    // Les lettres accentuées ne sont pas des « caractères de mot » pour \\b : on borne avec \\p{L}.
    const informal = /(?<!\p{L})(tu|ton|ta|tes|toi|te)(?!\p{L})|(?<!\p{L})(Dis|Pose|Présente|Compte|Lance|Mets|Sors|Reviens|Suis|Répète|Reste|Commence|Diffuse|Garde|Ajoute|Allonge|Laisse|Éparpille|Attends) /u
    for (const exercise of EXERCISES) {
      for (const text of [...exercise.steps, ...exercise.levels, exercise.caution ?? '', exercise.needs ?? '']) expect(text, exercise.id).not.toMatch(informal)
    }
  })
})

describe('« Ce qu’il faut » : les friandises', () => {
  it('ne nomme la friandise que si elle est vraiment renseignée', () => {
    expect(neededTreats(undefined)).toBe('Ses friandises préférées')
    expect(neededTreats('')).toBe('Ses friandises préférées')
    expect(neededTreats('Treat')).toBe('Ses friandises préférées')
    expect(neededTreats('friandises')).toBe('Ses friandises préférées')
    expect(neededTreats('Fromage, poulet séché…')).toBe('Ses friandises préférées')
    expect(neededTreats('Comté en dés')).toBe('Ses friandises préférées (Comté en dés)')
  })
})

describe('tout en français', () => {
  it('aucun nom d’exercice ni d’idée du jour n’est en anglais', () => {
    const english = /\b(look|that|engage|disengage|treat|retreat|up-down|kong|game|the|and)\b/i
    for (const exercise of EXERCISES) expect(exercise.name, exercise.id).not.toMatch(english)
  })

  it('les anciens moments s’affichent avec les noms français, sans être modifiés en base', () => {
    const old = { text: 'Look At That, 3 minutes. Sur son tapis, objet neutre.', tags: [] }
    expect(modernCard(old).text).toBe('Regarde ça, 3 minutes. Sur son tapis, objet neutre.')
    expect(old.text).toContain('Look At That')
    const plain = { text: 'Balade au parc.', tags: [] }
    expect(modernCard(plain)).toBe(plain)
  })
})
