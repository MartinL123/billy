import { addDays, type ISODate } from './dates'

export type Theme = 'bases' | 'tours' | 'proprete' | 'socialisation'

export interface Exercise {
  id: string
  theme: Theme
  name: string
  /** Le geste de base, en 2 ou 3 temps. */
  steps: string[]
  /**
   * Paliers, du plus facile au plus dur. On ne change qu'une difficulté à la fois :
   * d'abord la durée, puis la distance, puis les distractions.
   */
  levels: string[]
  /** Illustration (voir Illustration.tsx). */
  scene: string
  /** Ordre dont celui-ci découle dans l'arbre. */
  parent?: string
  /** Paliers à valider d'abord : [ordre, nombre de paliers validés]. */
  requires?: [string, number][]
}

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'bases', label: 'Ordres' },
  { value: 'tours', label: 'Tours' },
  { value: 'proprete', label: 'Propreté' },
  { value: 'socialisation', label: 'Socialisation' },
]

const AT_HOME = 'À la maison, avec la friandise qui guide son museau.'
const EMPTY_HAND = 'Main vide : le geste seul, la friandise arrive après.'
const WORD_ONLY = 'Au mot seul, sans geste.'

// Les identifiants sont enregistrés dans les séances : ne jamais les renommer.
export const EXERCISES: Exercise[] = [
  // ——— Attention ———
  {
    id: 'nom', theme: 'bases', name: 'Répondre à son nom', scene: 'nom',
    steps: ['Dis son nom une seule fois.', 'Il te regarde : « oui ! » et friandise.'],
    levels: ['À la maison, au calme.', 'À la maison, quand il est occupé : jouet, reniflage.', 'Dans le jardin ou la cage d’escalier.', 'Dehors au calme, en laisse.', 'Dehors avec du passage ou un chien au loin.'],
  },
  {
    id: 'regard', theme: 'bases', name: 'Regarde-moi', scene: 'regard', parent: 'nom', requires: [['nom', 2]],
    steps: ['Friandise près de tes yeux, dis « regarde ».', 'Il tient ton regard : « oui ! », friandise.'],
    levels: ['Une seconde de regard, friandise près de tes yeux.', 'Trois secondes, friandise dans l’autre main, bras écarté.', 'Cinq secondes, au mot seul.', 'Dehors au calme.', 'Dehors, quand un chien ou un passant approche.'],
  },
  {
    id: 'pas-toucher', theme: 'bases', name: 'Pas toucher', scene: 'pas-toucher', parent: 'regard', requires: [['regard', 2], ['lache', 2]],
    steps: ['Il vise la friandise : ne dis rien, attends.', 'Il renonce ou te regarde : récompense de l’autre main.'],
    levels: ['Friandise dans ta main fermée : il renonce.', 'Main ouverte : il ne se sert pas.', 'Friandise au sol, sous ton pied puis découverte.', 'Tu passes à côté en laisse sans qu’il la prenne.', 'Dehors, devant une trouvaille par terre.'],
  },
  // ——— Venir ———
  {
    id: 'touche', theme: 'bases', name: 'Touche la main', scene: 'touche',
    steps: ['Présente ta paume, toujours de la même façon.', 'Il la touche du museau : « oui ! », friandise.'],
    levels: ['Paume à 10 cm de son museau.', 'Paume à un pas : il se déplace pour toucher.', 'Des deux mains, à des hauteurs différentes.', 'À plusieurs mètres : il traverse la pièce.', 'Dehors, avec des distractions.'],
  },
  {
    id: 'rappel', theme: 'bases', name: 'Rappel', scene: 'rappel', parent: 'touche', requires: [['nom', 1]],
    steps: ['Appelle-le d’une voix joyeuse : « Billy, viens ! »', 'Il arrive jusqu’à ta main : fête et friandise.', 'Jamais de rappel pour le gronder.'],
    levels: ['Dans la même pièce, à 2 ou 3 mètres.', 'D’une pièce à l’autre, sans qu’il te voie.', 'Au jardin ou en longe, à 10 mètres.', 'Dehors au calme, en longe, pendant qu’il renifle.', 'En longe, avec une distraction : passant, chien au loin.'],
  },
  {
    id: 'stop', theme: 'bases', name: 'Stop à distance', scene: 'stop', parent: 'rappel', requires: [['rappel', 3], ['pas-bouger', 3]],
    steps: ['Pendant qu’il vient vers toi, main levée : « stop ».', 'Il s’arrête : va lui porter la friandise.', 'Toujours en longe, jamais près d’une route.'],
    levels: ['À 2 mètres, à la maison.', 'À 5 mètres, à la maison.', 'Au jardin, en longe.', 'Dehors en longe, quand il marche.', 'Dehors en longe, quand il trottine.'],
  },
  // ——— Positions ———
  {
    id: 'assis', theme: 'bases', name: 'Assis', scene: 'assis',
    steps: ['Friandise au-dessus du nez, recule-la vers ses oreilles.', 'Ses fesses touchent le sol : « oui ! », friandise.'],
    levels: [AT_HOME, EMPTY_HAND, WORD_ONLY, 'Dans une autre pièce ou au jardin, 5 secondes assis.', 'Dehors au calme, puis avec du passage.'],
  },
  {
    id: 'pas-bouger', theme: 'bases', name: 'Pas bouger', scene: 'pas-bouger', parent: 'assis', requires: [['assis', 2]],
    steps: ['Main ouverte : « pas bouger ».', 'Reviens toujours vers lui pour récompenser.', 'Libère-le d’un mot : « c’est bon ».'],
    levels: ['Deux secondes, toi juste à côté.', 'Dix secondes, toi à côté.', 'Vingt secondes ; puis un pas en arrière, durée courte.', 'Trois à cinq pas de distance.', 'Avec une distraction : tu bouges, un jouet tombe. Puis dehors.'],
  },
  {
    id: 'attends', theme: 'bases', name: 'Attends', scene: 'attends', parent: 'pas-bouger', requires: [['pas-bouger', 2]],
    steps: ['Dis « attends » avant ce qu’il veut.', 'Il bouge : on recommence. Il patiente : « vas-y ! »'],
    levels: ['Devant la gamelle tenue en main, 2 secondes.', 'Gamelle posée au sol, 5 secondes.', 'Devant la porte d’entrée ouverte.', 'À la portière de la voiture, au portail.', 'Partout avant de passer : porte, portail, escalier.'],
  },
  {
    id: 'traverse', theme: 'bases', name: 'Traverse', scene: 'traverse', parent: 'attends', requires: [['attends', 2], ['laisse', 2]],
    steps: ['Au bord, arrête-toi : il s’assoit.', 'Il te regarde : dis « traverse », avancez ensemble.', 'Il avance avant le mot : demi-tour, on recommence. Toujours en laisse.'],
    levels: ['À la maison : arrêt devant une ligne au sol, puis « traverse ».', 'Au bord du trottoir d’une rue calme.', 'Il s’arrête de lui-même au bord et attend le mot.', 'Rue passante, avec du bruit.', 'Tu descends du trottoir avant lui : il attend quand même le mot.'],
  },
  {
    id: 'couche', theme: 'bases', name: 'Couché', scene: 'couche',
    steps: ['Depuis assis, descends la friandise entre ses pattes.', 'Ses coudes touchent le sol : « oui ! », friandise.'],
    levels: [AT_HOME, EMPTY_HAND, WORD_ONLY, 'Dans une autre pièce ou au jardin, 5 secondes couché.', 'Dehors au calme, puis avec du passage.'],
  },
  {
    id: 'panier', theme: 'bases', name: 'Au panier', scene: 'panier', parent: 'couche', requires: [['couche', 2]],
    steps: ['Dis « au panier » en montrant son tapis.', 'Il y monte : récompense posée sur le tapis.'],
    levels: ['Il suit la friandise lancée sur le tapis.', 'Au geste vers le tapis, à un mètre.', 'Au mot, depuis l’autre bout de la pièce.', 'Depuis une autre pièce.', 'Quand on sonne ou qu’on passe à table.'],
  },
  {
    id: 'reste-panier', theme: 'bases', name: 'Rester au panier', scene: 'panier', parent: 'panier', requires: [['panier', 2], ['pas-bouger', 2]],
    steps: ['Au panier, demande « couché ».', 'Récompense entre ses pattes tant qu’il reste.', 'Libère-le d’un mot : « c’est bon ».'],
    levels: ['Couché au panier 10 secondes, toi à côté.', 'Une minute, tu t’éloignes de quelques pas.', 'Cinq minutes, pendant que tu t’actives dans la pièce.', 'Pendant un repas.', 'Quand quelqu’un entre.'],
  },
  // ——— Objets ———
  {
    id: 'lache', theme: 'bases', name: 'Lâche', scene: 'lache',
    steps: ['Présente une friandise contre l’objet.', 'Il lâche : « oui ! », friandise.', 'Rends-lui l’objet quand c’est possible.'],
    levels: ['Échange d’un jouet contre une friandise.', 'Au mot « lâche », la friandise arrive après.', 'En plein jeu de traction.', 'Avec un objet qu’il adore.', 'Dehors, avec un bâton ou une trouvaille.'],
  },
  {
    id: 'rapporte', theme: 'bases', name: 'Rapporte', scene: 'lache', parent: 'lache', requires: [['lache', 2]],
    steps: ['Lance un jouet tout près.', 'Il le prend : appelle-le joyeusement.', 'Échange contre une friandise, puis relance.'],
    levels: ['Il va jusqu’au jouet et le prend.', 'Il revient vers toi, jouet en gueule.', 'Il le lâche dans ta main.', 'Au jardin, à 10 mètres.', 'Dehors, en longe.'],
  },
  // ——— Marche ———
  {
    id: 'laisse', theme: 'bases', name: 'Marche en laisse', scene: 'laisse',
    steps: ['Laisse tendue : arrête-toi.', 'Laisse détendue : repartez.', 'Récompense à hauteur de ta jambe.'],
    levels: ['Dans le couloir : 5 pas laisse détendue.', 'Dans le jardin ou la cour.', 'Rue calme : 20 pas sans tirer.', 'Trajet habituel, avec les odeurs.', 'En croisant un chien ou des gens.'],
  },
  {
    id: 'pied', theme: 'bases', name: 'Au pied', scene: 'pied', parent: 'laisse', requires: [['laisse', 2], ['touche', 2]],
    steps: ['Ta main contre ta jambe : « au pied ».', 'Il marche à ta hauteur : friandise à la jambe.'],
    levels: ['Trois pas, friandise qui guide.', 'Dix pas, main vide.', 'Avec demi-tours et arrêts.', 'Dehors au calme.', 'En croisant un passant.'],
  },
  // ——— Tours ———
  {
    id: 'patte', theme: 'tours', name: 'Donne la patte', scene: 'patte', parent: 'assis', requires: [['assis', 2]],
    steps: ['Présente ta main, près de sa patte.', 'Il y pose la patte : « oui ! », friandise.'],
    levels: ['Il gratte ta main fermée : récompense.', 'Main ouverte, il y pose la patte.', 'Au mot « patte ».', 'Il laisse sa patte 3 secondes dans ta main.', 'Avec d’autres personnes.'],
  },
  {
    id: 'autre-patte', theme: 'tours', name: 'L’autre patte', scene: 'patte', parent: 'patte', requires: [['patte', 3]],
    steps: ['Présente ta main du côté de l’autre patte.', 'Dis « l’autre ». Il la lève : friandise.'],
    levels: ['Main du côté de l’autre patte : il la lève.', 'Au mot « l’autre ».', 'Tu alternes « patte » et « l’autre » sans erreur.', 'Il laisse chaque patte 3 secondes.', 'Avec d’autres personnes.'],
  },
  {
    id: 'tape', theme: 'tours', name: 'Tope là', scene: 'patte', parent: 'autre-patte', requires: [['autre-patte', 2]],
    steps: ['Main à plat, dressée devant lui.', 'Il tape dedans : « oui ! », friandise.'],
    levels: ['Main dressée à hauteur de sa patte.', 'Main plus haute.', 'Au mot « tope là ».', 'Une patte puis l’autre.', 'Avec d’autres personnes.'],
  },
  {
    id: 'tourne', theme: 'tours', name: 'Tourne', scene: 'tourne', parent: 'touche', requires: [['touche', 2]],
    steps: ['Guide son museau en cercle.', 'Tour complet : « oui ! », friandise.'],
    levels: [AT_HOME, 'Main vide, grand geste du bras.', 'Petit geste du doigt.', WORD_ONLY, 'Dans l’autre sens, puis dehors.'],
  },
  // ——— Propreté ———
  { id: 'sortie-repas', theme: 'proprete', name: 'Sortie après le repas', scene: 'dehors', steps: ['Sors-le dans le quart d’heure après chaque repas.', 'Il fait dehors : félicite-le sur place.'], levels: ['Il fait dehors après un repas.', 'Les trois repas d’une journée sans accident.', 'Une semaine sans accident après les repas.'] },
  { id: 'sortie-reveil', theme: 'proprete', name: 'Sortie au réveil', scene: 'dehors', steps: ['Dehors dès le réveil, avant tout le reste.', 'Félicite-le sur place.'], levels: ['Il fait dehors au réveil.', 'Aussi après chaque sieste.', 'Une semaine sans accident au réveil.'] },
  { id: 'demande', theme: 'proprete', name: 'Demander à sortir', scene: 'dehors', steps: ['Repère ses signaux : il tourne, renifle, va vers la porte.', 'Sors-le aussitôt et félicite dehors.'], levels: ['Tu repères ses signaux et tu le sors à temps.', 'Il va vers la porte de lui-même.', 'Il te prévient : il gratte, gémit ou te fixe.', 'Une semaine sans accident.'] },
  { id: 'nuit', theme: 'proprete', name: 'Nuit sans accident', scene: 'nuit', steps: ['Dernière sortie tard, première sortie tôt.', 'Nuit propre : note « Réussi ».'], levels: ['Cinq heures sans accident.', 'Sept heures.', 'Une semaine de nuits propres.'] },
  // ——— Socialisation ———
  { id: 'seul', theme: 'socialisation', name: 'Rester seul', scene: 'seul', steps: ['Pars sans cérémonie.', 'Reviens calmement, sans fête.'], levels: ['Une minute, toi dans la pièce d’à côté, porte fermée.', 'Cinq minutes, tu sors de la maison.', 'Trente minutes.', 'Deux heures.', 'Une demi-journée, calme à ton retour.'] },
  { id: 'manipulations', theme: 'socialisation', name: 'Manipulations', scene: 'manipulations', steps: ['Quelques secondes, puis friandise.', 'Arrête avant qu’il s’agite.'], levels: ['Pattes et oreilles, 2 secondes.', 'Soulever les babines, regarder les dents.', 'Brosse, serviette, essuyer les pattes.', 'Coupe-griffes posé contre une griffe, sans couper.', 'Par une autre personne, comme chez le véto.'] },
  { id: 'chiens', theme: 'socialisation', name: 'Rencontres de chiens', scene: 'chiens', steps: ['Garde la laisse détendue.', 'Écourte si l’un des deux se fige.'], levels: ['Voir un chien de loin et rester calme.', 'Croiser un chien en laisse sans tirer.', 'Se sentir 3 secondes, puis repartir.', 'Jouer avec un chien connu, et revenir au rappel.', 'Rester calme près d’un chien inconnu agité.'] },
  { id: 'bruits', theme: 'socialisation', name: 'Bruits de la ville', scene: 'bruits', steps: ['Reste à une distance où il mange encore.', 'Un bruit : une friandise.'], levels: ['Les bruits de la rue depuis la fenêtre.', 'Rue calme : il mange ses friandises.', 'Rue passante.', 'Camion, moto, travaux, à distance.', 'Marché, sortie d’école.'] },
  { id: 'voiture', theme: 'socialisation', name: 'Voiture', scene: 'voiture', steps: ['Il monte : friandise.', 'Vers un endroit agréable, pas seulement le véto.'], levels: ['Monter, moteur éteint.', 'Moteur allumé, à l’arrêt.', 'Cinq minutes de trajet.', 'Trente minutes.', 'Long trajet, calme.'] },
]

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)

export type SessionResult = 'difficile' | 'moyen' | 'reussi'

export const RESULTS: { value: SessionResult; label: string }[] = [
  { value: 'difficile', label: 'Difficile' },
  { value: 'moyen', label: 'Ça vient' },
  { value: 'reussi', label: 'Réussi' },
]

export interface SessionLike {
  date: ISODate
  exerciseId: string
  result: SessionResult
  createdAt?: string
}

const newestFirst = <T extends { date: ISODate; createdAt?: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

// ——— Paliers ———

/** Réussites demandées pour valider un palier… */
export const SUCCESSES_TO_PASS = 3
/** …parmi les dernières séances du palier (3 sur 4 : au moins 75 % de réussite). */
const WINDOW = 4

// « Il sait déjà » et « revenir en arrière » sont enregistrés comme des séances à part, pour rester synchronisés.
const MARK_PREFIX = 'palier-'
export const markId = (exerciseId: string) => `${MARK_PREFIX}${exerciseId}`
export const isMark = (session: { exerciseId: string }) => session.exerciseId.startsWith(MARK_PREFIX)

export interface Progress {
  /** Palier en cours, de 1 à `total` ; `total + 1` une fois tous les paliers validés. */
  level: number
  total: number
  /** Tous les paliers sont validés : on entretient, en variant les lieux. */
  maintenance: boolean
  /** Réussites comptées pour le palier en cours (0 à 3). */
  successes: number
  /** Les deux dernières séances du palier étaient difficiles. */
  struggling: boolean
  /** Jours où un palier a été validé par la pratique. */
  validations: ISODate[]
  started: boolean
}

/**
 * Où en est un ordre. Un palier se valide avec 3 réussites sur ses 4 dernières séances,
 * ou d'un coup avec « il sait déjà ». Un ordre n'est jamais « fini » : après le dernier palier vient l'entretien.
 */
export function progress(sessions: SessionLike[], exercise: Exercise): Progress {
  const total = exercise.levels.length
  const mark = markId(exercise.id)
  const own = sessions.filter((s) => s.exerciseId === exercise.id || s.exerciseId === mark).sort(newestFirst).reverse()
  let level = 1
  let window: SessionResult[] = []
  const validations: ISODate[] = []
  for (const session of own) {
    if (session.exerciseId === mark) {
      level = session.result === 'reussi' ? Math.min(total + 1, level + 1) : Math.max(1, level - 1)
      window = []
      continue
    }
    window.push(session.result)
    if (level <= total && window.slice(-WINDOW).filter((r) => r === 'reussi').length >= SUCCESSES_TO_PASS) {
      level += 1
      window = []
      validations.push(session.date)
    }
  }
  const recent = window.slice(-WINDOW)
  return {
    level,
    total,
    maintenance: level > total,
    successes: Math.min(SUCCESSES_TO_PASS, recent.filter((r) => r === 'reussi').length),
    struggling: window.length >= 2 && window.slice(-2).every((r) => r === 'difficile'),
    validations,
    started: own.length > 0,
  }
}

/** Texte du palier en cours ; en entretien, on varie. */
export function levelGoal(exercise: Exercise, level: number): string {
  return exercise.levels[level - 1] ?? 'Entretien : change de lieu, de moment, de personne. Il y a toujours plus dur à tenter.'
}

export type Status = 'a-decouvrir' | 'en-cours' | 'entretien'

export function exerciseStatus(sessions: SessionLike[], exerciseId: string): Status {
  const exercise = exerciseById(exerciseId)
  if (!exercise) return 'a-decouvrir'
  const p = progress(sessions, exercise)
  return p.maintenance ? 'entretien' : p.started ? 'en-cours' : 'a-decouvrir'
}

/** Nombre de paliers validés pour un ordre. */
export const validatedLevels = (sessions: SessionLike[], exercise: Exercise) => progress(sessions, exercise).level - 1

/** Un ordre s'ouvre quand ses prérequis ont assez de paliers validés, ou dès qu'il a été travaillé une fois. */
export function isUnlocked(sessions: SessionLike[], exercise: Exercise): boolean {
  if (!exercise.requires?.length) return true
  if (sessions.some((s) => s.exerciseId === exercise.id || s.exerciseId === markId(exercise.id))) return true
  return exercise.requires.every(([id, levels]) => {
    const required = exerciseById(id)
    return !required || validatedLevels(sessions, required) >= levels
  })
}

/** Jours consécutifs d'entraînement. La série tient encore si le dernier jour est hier. */
export function streak(dates: ISODate[], today: ISODate): number {
  const days = new Set(dates)
  let cursor = days.has(today) ? today : addDays(today, -1)
  let count = 0
  while (days.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export const FEAR_LEVELS = [
  { value: 1, label: 'Serein' },
  { value: 2, label: 'Attentif' },
  { value: 3, label: 'Inquiet' },
  { value: 4, label: 'Très tendu' },
  { value: 5, label: 'Panique' },
]

export const fearLabel = (level: number) => FEAR_LEVELS.find((f) => f.value === level)?.label ?? ''

export const SUGGESTED_TRIGGERS = ['La ruelle', 'Les enfants', 'Le reflet la nuit']

interface ExposureLike {
  date: ISODate
  trigger: string
  fear: number
  distance?: number
  createdAt?: string
}

export type Trend = 'mieux' | 'stable' | 'moins-bien'

export interface FearSummary<T> {
  trigger: string
  /** De la plus récente à la plus ancienne. */
  exposures: T[]
  latest: T
  first: T
  trend: Trend
}

const sameTrigger = (a: string, b: string) => a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr')

/** Regroupe les expositions par déclencheur et compare la dernière à la toute première. */
export function fearSummaries<T extends ExposureLike>(exposures: T[]): FearSummary<T>[] {
  const groups: T[][] = []
  for (const exposure of [...exposures].sort(newestFirst)) {
    const group = groups.find((g) => g[0] && sameTrigger(g[0].trigger, exposure.trigger))
    if (group) group.push(exposure)
    else groups.push([exposure])
  }
  return groups.map((group) => {
    const latest = group[0]!
    const first = group[group.length - 1]!
    const trend: Trend = latest.fear < first.fear ? 'mieux' : latest.fear > first.fear ? 'moins-bien' : 'stable'
    return { trigger: latest.trigger, exposures: group, latest, first, trend }
  })
}

export function allTriggers(used: string[]): string[] {
  const out: string[] = []
  for (const trigger of [...SUGGESTED_TRIGGERS, ...used]) {
    if (trigger.trim() && !out.some((t) => sameTrigger(t, trigger))) out.push(trigger.trim())
  }
  return out
}

// ——— Tendance d'un ordre ———

const SCORE: Record<SessionResult, number> = { difficile: 0, moyen: 0.5, reussi: 1 }
const average = (results: SessionResult[]) => results.reduce((sum, r) => sum + SCORE[r], 0) / results.length

export interface Mastery {
  /** Nombre de séances notées. */
  count: number
  /** Évolution : les 3 dernières séances comparées aux 3 d'avant ; `undefined` avant 4 séances. */
  trend?: Trend
  /** Les 8 derniers résultats, du plus ancien au plus récent. */
  recent: SessionResult[]
}

/** Les dernières séances d'un ordre, et s'il s'améliore ou se dégrade. */
export function mastery(sessions: SessionLike[], exerciseId: string): Mastery {
  const results = sessions
    .filter((s) => s.exerciseId === exerciseId)
    .sort(newestFirst)
    .reverse()
    .map((s) => s.result)
  if (results.length === 0) return { count: 0, recent: [] }
  let trend: Trend | undefined
  if (results.length >= 4) {
    const diff = average(results.slice(-3)) - average(results.slice(-6, -3))
    trend = diff >= 0.2 ? 'mieux' : diff <= -0.2 ? 'moins-bien' : 'stable'
  }
  return { count: results.length, trend, recent: results.slice(-8) }
}
