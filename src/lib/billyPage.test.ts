import { describe, expect, it } from 'vitest'
import { badgeName, badgeRing, sessionTitle, isTrainingEntry, notedExercise, notedMinutes, pathProgress, progressDate, progressFeed, RING_GOLD, RING_PALE, ringArcs, trainingWeek, weekSummary } from './billyPage'

const seance = (id: string, date: string, extra: Record<string, unknown> = {}) => ({ id, date, text: 'Jeu du prénom, 3 minutes. Salon.', skills: ['rappel'], feeling: 'bien', createdAt: `${date}T10:00:00Z`, ...extra })

describe('sa semaine (T-104)', () => {
  // Jeudi 22 octobre 2026 : la semaine va du lundi 19 au dimanche 25.
  const today = '2026-10-22'

  it('coche les jours de séance, met la lune les jours de repos, entoure aujourd’hui et laisse la suite en pointillés', () => {
    const entries = [seance('a', '2026-10-19'), seance('b', '2026-10-19', { createdAt: '2026-10-19T08:00:00Z' }), seance('c', '2026-10-21'), seance('vieux', '2026-10-12')]
    const week = trainingWeek(today, entries, ['2026-10-20'], () => 3)
    expect(week.days.map((d) => d.state)).toEqual(['fait', 'repos', 'fait', 'attente', 'attente', 'attente', 'attente'])
    expect(week.days.map((d) => d.today)).toEqual([false, false, false, true, false, false, false])
    expect(week.days.map((d) => d.upcoming)).toEqual([false, false, false, false, true, true, true])
    // Les séances du jour, de la plus ancienne à la plus récente.
    expect(week.days[0]!.sessionIds).toEqual(['b', 'a'])
    expect(week.sessions).toBe(3)
    expect(week.minutes).toBe(9)
  })

  it('compte les minutes notées, sinon la durée d’une séance à son âge', () => {
    const week = trainingWeek(today, [seance('a', '2026-10-19', { text: 'Tapis, 5 minutes.' }), seance('b', '2026-10-20', { text: 'Très bien.' })], [], () => 3)
    expect(week.minutes).toBe(8)
    expect(weekSummary(week)).toBe('2 séances · 8 min')
    expect(weekSummary({ sessions: 1, minutes: 3 })).toBe('1 séance · 3 min')
    expect(weekSummary({ sessions: 0, minutes: 0 })).toBe('Aucune séance')
  })

  it('ne compte ni les balades, ni les cartes écrites par l’app, ni une note sans compétence', () => {
    expect(isTrainingEntry(seance('a', today))).toBe(true)
    expect(isTrainingEntry(seance('repos-2026-10-22', today))).toBe(false)
    expect(isTrainingEntry(seance('palier-rappel-2', today))).toBe(false)
    expect(isTrainingEntry(seance('niveau-3', today))).toBe(false)
    expect(isTrainingEntry(seance('w', today, { route: { points: [[1, 2]], moments: [] } }))).toBe(false)
    expect(isTrainingEntry(seance('n', today, { skills: [] }))).toBe(false)
  })

  it('lit la durée et l’exercice du texte pré-rempli', () => {
    expect(notedMinutes('Jeu du prénom, 3 minutes. Salon.')).toBe(3)
    expect(notedMinutes('10 min au parc')).toBe(10)
    expect(notedMinutes('Super séance')).toBeUndefined()
    expect(notedExercise('Jeu du prénom, 3 minutes. Salon.')).toBe('Jeu du prénom')
    expect(notedExercise('Il a bien joué.')).toBeUndefined()
    expect(sessionTitle({ text: 'Il a bien joué.', skills: ['rappel', 'lien'] })).toBe('Le Rappel, Le Lien')
    expect(sessionTitle({ text: 'Tapis, 5 minutes.', skills: ['calme'] })).toBe('Tapis')
  })
})

describe('ses progrès (T-104)', () => {
  const xp = [
    { id: 'palier-rappel-2', date: '2026-10-21', kind: 'palier', bossId: 'rappel', createdAt: '2026-10-21T09:00:00Z' },
    { id: 'palier-soins-1', date: '2026-10-10', kind: 'palier', bossId: 'soins', key: 'avant' },
    { id: 'palier-calme-3', date: '2026-10-15', kind: 'palier', bossId: 'calme' },
    { id: 'abc', date: '2026-10-21', kind: 'moment', bossId: 'rappel' },
  ]
  const entries = [
    seance('s1', '2026-10-19', { feeling: 'super' }),
    seance('s2', '2026-10-18', { feeling: 'bien' }),
    { id: 'w1', date: '2026-10-20', text: 'Balade du matin', createdAt: '2026-10-20T07:00:00Z', route: { points: [[1, 2]], moments: [{ type: 'rappel', street: 'Rue des Lilas' }] } },
    { id: 'w2', date: '2026-10-17', text: 'Le grand tour\nNote', route: { points: [[1, 2]], moments: [{ type: 'rappel' }, { type: 'rappel' }] } },
  ]

  it('mêle étapes acquises, séances « Super » et « Super rappel » en balade, du plus récent au plus ancien', () => {
    const feed = progressFeed(entries, xp, { rappel: { level: 2 }, calme: { level: 2 } })
    expect(feed.map((i) => [i.kind, i.date])).toEqual([
      ['etape', '2026-10-21'],
      ['rappel', '2026-10-20'],
      ['seance', '2026-10-19'],
      ['rappel', '2026-10-17'],
    ])
    expect(feed[0]).toMatchObject({ title: 'Revient même en laissant un jouet', detail: 'Étape acquise · Le Rappel', to: '/competence/rappel' })
    expect(feed[1]).toMatchObject({ title: 'Super rappel en balade', detail: 'Rue des Lilas', to: '/souvenir/w1' })
    expect(feed[2]).toMatchObject({ title: 'Séance « Super »', detail: 'Jeu du prénom · 3 min', to: '/souvenir/s1' })
    // Sans rue connue : le nom de la balade. Un seul « Super rappel » par balade.
    expect(feed[3]!.detail).toBe('Le grand tour')
  })

  it('écarte les étapes « avant l’app » et une étape décochée depuis', () => {
    const feed = progressFeed([], xp, { rappel: { level: 1 }, soins: { level: 1 }, calme: { level: 3 } })
    expect(feed.map((i) => i.id)).toEqual(['palier-calme-3'])
  })

  it('date en mots les deux derniers jours', () => {
    expect(progressDate('2026-10-22', '2026-10-22')).toBe('Aujourd’hui')
    expect(progressDate('2026-10-21', '2026-10-22')).toBe('Hier')
    expect(progressDate('2026-10-20', '2026-10-22')).toBe('20 oct.')
    expect(progressDate('2025-12-20', '2026-10-22')).toBe('20 déc. 2025')
  })
})

describe('ses badges (T-104)', () => {
  it('allume un segment par étape à la couleur du territoire, pâle sinon', () => {
    expect(badgeRing(2, '#2559A8', true)).toEqual({ segments: ['#2559A8', '#2559A8', RING_PALE, RING_PALE, RING_PALE], mastered: false, status: 'En cours' })
    expect(badgeRing(0, '#2559A8', false)).toEqual({ segments: Array(5).fill(RING_PALE), mastered: false, status: undefined })
  })

  it('devient tout doré une fois maîtrisée, même si elle n’est plus en cours', () => {
    expect(badgeRing(5, '#2559A8', false)).toEqual({ segments: Array(5).fill(RING_GOLD), mastered: true, status: 'Maîtrisé' })
    expect(badgeRing(7, '#2559A8', true).status).toBe('Maîtrisé')
  })

  it('dessine 5 arcs séparés, le premier juste à droite du haut', () => {
    const arcs = ringArcs(28, 24)
    expect(arcs).toHaveLength(5)
    expect(arcs[0]).toBe('M29.7 4.1 A24 24 0 0 1 50.3 19')
    expect(new Set(arcs).size).toBe(5)
  })

  it('raccourcit seulement les noms longs', () => {
    expect(badgeName('Les Bonnes manières')).toBe('Bonnes manières')
    expect(badgeName('Les Congénères')).toBe('Les Congénères')
    expect(badgeName('Le Rappel')).toBe('Le Rappel')
  })

  it('trace le chemin vert jusqu’à l’étape en cours', () => {
    expect(pathProgress(0)).toBe(0)
    expect(pathProgress(2)).toBe(0.5)
    expect(pathProgress(5)).toBe(1)
  })
})
