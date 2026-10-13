import { addDays, dayNumber, diffDays, type ISODate } from './dates'
import { isChew } from './chews'
import { EXERCISES, exerciseStatus, isMark, isUnlocked, mastery, progress, validatedLevels, type Exercise, type SessionResult, type Theme } from './training'

// Tout est calculé à partir des séances et des expositions enregistrées : rien d'autre n'est stocké,
// donc l'expérience est la même sur tous les appareils et se recalcule si on supprime une séance.

// ——— Jeux ———

export interface Game {
  id: string
  name: string
  minutes: number
  /** Ce que le jeu fait travailler. */
  skill: string
  /** Illustration (voir Illustration.tsx). */
  scene: string
  steps: string[]
}

export const GAMES: Game[] = [
  {
    id: 'cache-cache',
    scene: 'rappel',
    name: 'Cache-cache',
    minutes: 5,
    skill: 'Rappel',
    steps: ['Fais-le attendre ou demande à quelqu’un de le tenir.', 'Cache-toi tout près, puis appelle-le une seule fois.', 'Fête-le quand il te trouve. Cache-toi un peu mieux à chaque tour.'],
  },
  {
    id: 'fouille',
    scene: 'flair',
    name: 'Tapis de fouille',
    minutes: 5,
    skill: 'Flair et calme',
    steps: ['Roule quelques croquettes de sa ration dans une vieille serviette.', 'Pose-la au sol et dis « cherche ».', 'Laisse-le se débrouiller : renifler le fatigue et l’apaise.'],
  },
  {
    id: 'gobelets',
    scene: 'gobelets',
    name: 'Les trois gobelets',
    minutes: 5,
    skill: 'Concentration',
    steps: ['Cache une croquette sous un gobelet, devant lui.', 'Ajoute deux gobelets vides, puis mélange lentement.', 'Il désigne le bon du museau ou de la patte : il gagne la croquette.'],
  },
  {
    id: 'tresor',
    scene: 'flair',
    name: 'Chasse au trésor',
    minutes: 10,
    skill: 'Flair',
    steps: ['Pendant qu’il attend, cache 5 à 10 croquettes dans une pièce ou le jardin.', 'Libère-le avec « cherche ».', 'Commence facile, bien en vue, puis corse les cachettes.'],
  },
  {
    id: 'ping-pong',
    scene: 'ping-pong',
    name: 'Rappel ping-pong',
    minutes: 5,
    skill: 'Rappel',
    steps: ['À deux, placez-vous à quelques mètres l’un de l’autre.', 'Appelez-le chacun votre tour et récompensez à l’arrivée.', 'Reculez d’un pas à chaque aller-retour réussi.'],
  },
  {
    id: 'soleil',
    scene: 'pas-bouger',
    name: '1, 2, 3, soleil',
    minutes: 5,
    skill: 'Pas bouger',
    steps: ['Demande « pas bouger », tourne le dos une seconde.', 'Retourne-toi : s’il n’a pas bougé, reviens le récompenser.', 'Allonge peu à peu la durée, puis la distance.'],
  },
  {
    id: 'tire-lache',
    scene: 'lache',
    name: 'Tire et lâche',
    minutes: 5,
    skill: 'Lâche / Donne',
    steps: ['Joue à tirer sur une corde quelques secondes.', 'Fige-toi et dis « lâche » ; échange contre une croquette s’il faut.', 'Dès qu’il lâche, relance le jeu : lâcher fait repartir la partie.'],
  },
  {
    id: 'parcours',
    scene: 'parcours',
    name: 'Parcours maison',
    minutes: 10,
    skill: 'Confiance',
    steps: ['Installe 3 obstacles simples : un coussin, un balai posé au sol, un carton ouvert.', 'Guide-le avec une croquette, sans le forcer.', 'Félicite chaque obstacle franchi, même reniflé seulement.'],
  },
  {
    id: 'touche',
    scene: 'touche',
    name: 'Touche la main',
    minutes: 3,
    skill: 'Attention',
    steps: ['Présente ta paume à quelques centimètres de son museau.', 'Dès qu’il la touche, dis « oui » et récompense.', 'Éloigne la main, change de côté, puis fais-le te suivre en marchant.'],
  },
]

const GAME_PREFIX = 'jeu-'
export const gameSessionId = (game: Game) => `${GAME_PREFIX}${game.id}`
export const isGame = (session: { exerciseId: string }) => session.exerciseId.startsWith(GAME_PREFIX)
/** Séance sur un ordre du programme (ni jeu, ni chose à mâcher). */
export const isExercise = (session: { exerciseId: string }) => !isGame(session) && !isChew(session) && !isMark(session)

// ——— Expérience ———

export const XP = {
  session: { difficile: 10, moyen: 15, reussi: 20 } satisfies Record<SessionResult, number>,
  game: 15,
  /** Chose à mâcher donnée. */
  chew: 10,
  exposure: 15,
  /** Peur plus basse que la fois précédente pour le même déclencheur. */
  braver: 10,
  /** Palier d'un ordre validé par la pratique. */
  level: 30,
  mission: 10,
  perfectDay: 20,
}

interface SessionLike {
  date: ISODate
  exerciseId: string
  result: SessionResult
  createdAt?: string
}

interface ExposureLike {
  date: ISODate
  trigger: string
  fear: number
  createdAt?: string
}

const oldestFirst = <T extends { date: ISODate; createdAt?: string }>(a: T, b: T) =>
  a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
const triggerKey = (trigger: string) => trigger.trim().toLocaleLowerCase('fr')

export interface DayMissions {
  exercise: boolean
  game: boolean
  /** Une exposition à une peur, ou un deuxième exercice différent. */
  challenge: boolean
}

/** Missions remplies un jour donné. */
export function missionsDone(sessions: SessionLike[], exposures: ExposureLike[], day: ISODate): DayMissions {
  const ofDay = sessions.filter((s) => s.date === day)
  const exercises = new Set(ofDay.filter(isExercise).map((s) => s.exerciseId))
  return {
    exercise: exercises.size >= 1,
    game: ofDay.some(isGame),
    challenge: exercises.size >= 2 || exposures.some((e) => e.date === day),
  }
}

export const missionCount = (m: DayMissions) => Number(m.exercise) + Number(m.game) + Number(m.challenge)

/** Expérience gagnée, jour par jour. */
export function xpByDay(sessions: SessionLike[], exposures: ExposureLike[]): Map<ISODate, number> {
  const days = new Map<ISODate, number>()
  const add = (date: ISODate, xp: number) => days.set(date, (days.get(date) ?? 0) + xp)

  for (const session of sessions) {
    if (isMark(session)) continue
    if (isGame(session)) add(session.date, XP.game)
    else if (isChew(session)) add(session.date, XP.chew)
    else add(session.date, XP.session[session.result] ?? XP.session.moyen)
  }
  for (const exercise of EXERCISES) {
    for (const date of progress(sessions, exercise).validations) add(date, XP.level)
  }

  const lastFear = new Map<string, number>()
  for (const exposure of [...exposures].sort(oldestFirst)) {
    const key = triggerKey(exposure.trigger)
    const previous = lastFear.get(key)
    add(exposure.date, XP.exposure + (previous !== undefined && exposure.fear < previous ? XP.braver : 0))
    lastFear.set(key, exposure.fear)
  }

  for (const day of [...days.keys()]) {
    const count = missionCount(missionsDone(sessions, exposures, day))
    add(day, count * XP.mission + (count === 3 ? XP.perfectDay : 0))
  }
  return days
}

export function totalXp(byDay: Map<ISODate, number>): number {
  let total = 0
  for (const xp of byDay.values()) total += xp
  return total
}

// ——— Niveaux ———

const TITLES = [
  'Chiot curieux',
  'Apprenti',
  'Élève attentif',
  'Bon compagnon',
  'Petit malin',
  'Explorateur',
  'Complice',
  'As du rappel',
  'Expert',
  'Champion',
  'Maître chien',
  'Légende du quartier',
]

/** Expérience cumulée pour atteindre un niveau : 0, 100, 250, 450, 700… (chaque palier demande 50 de plus). */
export const xpForLevel = (level: number) => 25 * (level - 1) * (level + 2)

export interface LevelInfo {
  level: number
  title: string
  /** Expérience acquise dans le niveau en cours. */
  current: number
  /** Expérience à gagner pour passer au niveau suivant. */
  needed: number
  nextTitle: string
}

const titleFor = (level: number) => TITLES[Math.min(level, TITLES.length) - 1]!

export function levelInfo(xp: number): LevelInfo {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  return {
    level,
    title: titleFor(level),
    current: xp - xpForLevel(level),
    needed: xpForLevel(level + 1) - xpForLevel(level),
    nextTitle: titleFor(level + 1),
  }
}

// ——— Séries ———

export function longestStreak(dates: ISODate[]): number {
  const days = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let previous: ISODate | undefined
  for (const day of days) {
    run = previous && diffDays(previous, day) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }
  return best
}

/** Les 7 jours de la semaine en cours (lundi → dimanche). */
export function weekOf(today: ISODate): ISODate[] {
  const offset = (((dayNumber(today) + 3) % 7) + 7) % 7
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - offset))
}

// ——— Recommandations ———

export interface Recommendation {
  exercise: Exercise
  reason: string
  /** Conseil d'ajustement selon les dernières séances. */
  advice?: string
}

/** Ordres à travailler aujourd'hui, du plus utile au moins utile, d'après ce qui a été fait avant aujourd'hui. */
export function recommendExercises(sessions: SessionLike[], today: ISODate): Recommendation[] {
  const before = sessions.filter((s) => s.date < today && (isExercise(s) || isMark(s)))
  const worked = before.filter(isExercise)
  const since = (id: string) => {
    const last = worked.filter((s) => s.exerciseId === id).sort(oldestFirst).pop()
    return last ? diffDays(last.date, today) : Infinity
  }
  const ago = (days: number) => (days === Infinity ? 'À reprendre' : days === 1 ? 'Travaillé hier' : `Pas travaillé depuis ${days} jours`)

  // Seuls les ordres ouverts dans l'arbre sont proposés.
  const ready = EXERCISES.filter((e) => isUnlocked(before, e)).map((exercise) => {
    const state = progress(before, exercise)
    const declining = state.struggling || mastery(worked, exercise.id).trend === 'moins-bien'
    return { exercise, state, declining }
  })
  const inProgress = ready
    .filter((r) => r.state.started && !r.state.maintenance)
    // Un ordre qui se dégrade passe avant tout le reste, puis le plus délaissé.
    .sort((a, b) => Number(b.declining) - Number(a.declining) || since(b.exercise.id) - since(a.exercise.id))
  const fresh = ready.filter((r) => !r.state.started)
  const kept = ready.filter((r) => r.state.maintenance).sort((a, b) => since(b.exercise.id) - since(a.exercise.id))

  return [
    ...inProgress.map(({ exercise, state, declining }): Recommendation => ({
      exercise,
      reason: declining ? 'En baisse ces derniers temps' : ago(since(exercise.id)),
      advice: state.struggling
        ? 'Deux séances difficiles : raccourcis, rapproche-toi, et termine sur une réussite facile.'
        : state.successes === 2
          ? 'Encore une réussite et le palier est validé !'
          : undefined,
    })),
    ...fresh.map(({ exercise }): Recommendation => ({ exercise, reason: 'Nouveau à découvrir' })),
    ...kept.map(({ exercise }): Recommendation => ({ exercise, reason: 'Entretien' })),
  ]
}

/** Jeu du jour : le même pour toute la journée, il change chaque jour. */
export const gameOfTheDay = (today: ISODate): Game => GAMES[((dayNumber(today) % GAMES.length) + GAMES.length) % GAMES.length]!

/** Peur à travailler en priorité : celle dont le dernier niveau noté est le plus haut (au moins 2). */
export function fearToWork(exposures: ExposureLike[]): string | undefined {
  const latest = new Map<string, ExposureLike>()
  for (const exposure of [...exposures].sort(oldestFirst)) latest.set(triggerKey(exposure.trigger), exposure)
  return [...latest.values()].filter((e) => e.fear >= 2).sort((a, b) => b.fear - a.fear || a.date.localeCompare(b.date))[0]?.trigger
}

// ——— Succès ———

export interface Badge {
  id: string
  name: string
  detail: string
  earned: boolean
}

const THEME_BADGES: { theme: Theme; id: string; name: string; detail: string }[] = [
  { theme: 'bases', id: 'bases', name: 'Bases solides', detail: 'Tous les ordres au palier 3' },
  { theme: 'tours', id: 'tours', name: 'Artiste', detail: 'Tous les tours au palier 3' },
  { theme: 'proprete', id: 'proprete', name: 'Propre !', detail: 'Toute la propreté validée' },
  { theme: 'socialisation', id: 'social', name: 'Sociable', detail: 'Toute la socialisation au palier 3' },
]

export function badges(sessions: SessionLike[], exposures: ExposureLike[], xp: number): Badge[] {
  const gamesPlayed = new Set(sessions.filter(isGame).map((s) => s.exerciseId)).size
  const levels = new Map(EXERCISES.map((e) => [e.id, validatedLevels(sessions, e)]))
  const validated = [...levels.values()].reduce((sum, n) => sum + n, 0)
  const kept = EXERCISES.filter((e) => exerciseStatus(sessions, e.id) === 'entretien').length
  const real = sessions.filter((s) => !isMark(s))
  const best = longestStreak([...real.map((s) => s.date), ...exposures.map((e) => e.date)])
  const perfectDays = [...new Set(real.map((s) => s.date))].filter((day) => missionCount(missionsDone(sessions, exposures, day)) === 3).length

  // Courage : une peur redescendue d'au moins 2 niveaux par rapport à son plus haut.
  const peaks = new Map<string, number>()
  let braver = false
  for (const exposure of [...exposures].sort(oldestFirst)) {
    const key = triggerKey(exposure.trigger)
    const peak = Math.max(peaks.get(key) ?? 0, exposure.fear)
    peaks.set(key, peak)
    if (peak - exposure.fear >= 2) braver = true
  }

  const streakBadge = (days: number, name: string): Badge => ({ id: `serie-${days}`, name, detail: `${days} jours de suite`, earned: best >= days })

  return [
    { id: 'premiere', name: 'Premier pas', detail: 'Première séance notée', earned: real.length + exposures.length > 0 },
    streakBadge(3, 'Lancé'),
    streakBadge(7, 'Une semaine'),
    streakBadge(14, 'Régulier'),
    streakBadge(30, 'Inarrêtable'),
    { id: 'parfaite', name: 'Journée parfaite', detail: 'Les 3 missions le même jour', earned: perfectDays >= 1 },
    { id: 'palier-1', name: 'Ça rentre', detail: 'Premier palier validé', earned: validated >= 1 },
    { id: 'palier-10', name: 'Bon élève', detail: '10 paliers validés', earned: validated >= 10 },
    { id: 'palier-30', name: 'Premier de la classe', detail: '30 paliers validés', earned: validated >= 30 },
    { id: 'entretien', name: 'Au bout', detail: 'Un ordre validé jusqu’au dernier palier', earned: kept >= 1 },
    ...THEME_BADGES.map(({ theme, id, name, detail }) => ({
      id,
      name,
      detail,
      earned: EXERCISES.filter((e) => e.theme === theme).every((e) => (levels.get(e.id) ?? 0) >= Math.min(3, e.levels.length)),
    })),
    { id: 'joueur', name: 'Joueur', detail: '5 jeux différents essayés', earned: gamesPlayed >= 5 },
    { id: 'courage', name: 'Courageux', detail: 'Une peur redescendue de 2 niveaux', earned: braver },
    { id: 'expositions', name: 'Apprivoisé', detail: '10 expositions notées', earned: exposures.length >= 10 },
    { id: 'niveau-5', name: 'Niveau 5', detail: 'Atteindre le niveau 5', earned: levelInfo(xp).level >= 5 },
    { id: 'niveau-10', name: 'Niveau 10', detail: 'Atteindre le niveau 10', earned: levelInfo(xp).level >= 10 },
  ]
}
