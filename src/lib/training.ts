import { addDays, type ISODate } from './dates'

export type Theme = 'bases' | 'proprete' | 'socialisation' | 'avance'

export interface Exercise {
  id: string
  theme: Theme
  name: string
  /** 2 ou 3 gestes courts, dans l'ordre. */
  steps: string[]
  /** Illustration (voir Illustration.tsx). */
  scene: string
  /** Ordres à acquérir d'abord (pour les ordres « plus tard »). */
  requires?: string[]
}

/** Thèmes du programme de départ. Les ordres « plus tard » (thème `avance`) s'ajoutent quand les bases sont là. */
export const THEMES: { value: Theme; label: string }[] = [
  { value: 'bases', label: 'Bases' },
  { value: 'proprete', label: 'Propreté' },
  { value: 'socialisation', label: 'Socialisation' },
]

// Les identifiants sont enregistrés dans les séances : ne jamais les renommer.
export const EXERCISES: Exercise[] = [
  { id: 'nom', theme: 'bases', name: 'Répondre à son nom', scene: 'nom', steps: ['Dis son nom une seule fois.', 'Il te regarde : « oui ! » et friandise.'] },
  { id: 'assis', theme: 'bases', name: 'Assis', scene: 'assis', steps: ['Friandise au-dessus du nez, recule-la vers ses oreilles.', 'Ses fesses touchent le sol : « oui ! » et friandise.'] },
  { id: 'couche', theme: 'bases', name: 'Couché', scene: 'couche', steps: ['Depuis assis, descends la friandise entre ses pattes.', 'Ses coudes touchent le sol : friandise.'] },
  { id: 'pas-bouger', theme: 'bases', name: 'Pas bouger', scene: 'pas-bouger', steps: ['Main ouverte, dis « pas bouger », recule d’un pas.', 'Reviens vers lui, puis récompense.', 'Allonge la durée avant la distance.'] },
  { id: 'rappel', theme: 'bases', name: 'Rappel', scene: 'rappel', steps: ['À courte distance, appelle-le d’une voix joyeuse.', 'Il arrive : fête et friandise.', 'Jamais de rappel pour le gronder.'] },
  { id: 'laisse', theme: 'bases', name: 'Marche en laisse', scene: 'laisse', steps: ['Laisse tendue : arrête-toi.', 'Laisse détendue : repartez.', 'Récompense à hauteur de ta jambe.'] },
  { id: 'lache', theme: 'bases', name: 'Lâche / Donne', scene: 'lache', steps: ['Présente une friandise contre l’objet.', 'Il lâche : « oui ! », friandise.', 'Rends-lui l’objet quand c’est possible.'] },
  { id: 'sortie-repas', theme: 'proprete', name: 'Sortie après le repas', scene: 'dehors', steps: ['Sors-le dans le quart d’heure après chaque repas.', 'Il fait dehors : félicite-le sur place.'] },
  { id: 'sortie-reveil', theme: 'proprete', name: 'Sortie au réveil', scene: 'dehors', steps: ['Dehors dès le réveil et après chaque sieste.', 'Félicite-le sur place.'] },
  { id: 'demande', theme: 'proprete', name: 'Demander à sortir', scene: 'dehors', steps: ['Repère ses signaux : il tourne, renifle, va vers la porte.', 'Sors-le aussitôt et félicite dehors.'] },
  { id: 'nuit', theme: 'proprete', name: 'Nuit sans accident', scene: 'nuit', steps: ['Dernière sortie tard, première sortie tôt.', 'Nuit propre : note « Réussi ».'] },
  { id: 'seul', theme: 'socialisation', name: 'Rester seul', scene: 'seul', steps: ['Sors quelques minutes, sans cérémonie.', 'Reviens calmement.', 'Allonge peu à peu.'] },
  { id: 'manipulations', theme: 'socialisation', name: 'Manipulations', scene: 'manipulations', steps: ['Touche une patte, une oreille, soulève une babine.', 'Quelques secondes, puis friandise.', 'Arrête avant qu’il s’agite.'] },
  { id: 'chiens', theme: 'socialisation', name: 'Rencontres de chiens', scene: 'chiens', steps: ['Choisis un chien calme et connu.', 'Laisse-les se sentir quelques secondes.', 'Écourte si l’un des deux se fige.'] },
  { id: 'bruits', theme: 'socialisation', name: 'Bruits de la ville', scene: 'bruits', steps: ['Reste à une distance où il mange encore.', 'Un bruit : une friandise.', 'Rapproche-toi au fil des jours.'] },
  { id: 'voiture', theme: 'socialisation', name: 'Voiture', scene: 'voiture', steps: ['Moteur éteint : il monte, friandise.', 'Puis trajets de quelques minutes vers un endroit agréable.'] },
  { id: 'regard', theme: 'avance', name: 'Regarde-moi', scene: 'regard', requires: ['nom'], steps: ['Friandise près de tes yeux, dis « regarde ».', 'Il tient ton regard une seconde : friandise.', 'Allonge la durée, puis ajoute des distractions.'] },
  { id: 'attends', theme: 'avance', name: 'Attends', scene: 'attends', requires: ['assis', 'pas-bouger'], steps: ['Assis devant la gamelle ou la porte, dis « attends ».', 'Il bouge : on recommence.', 'Il patiente : « vas-y ! »'] },
  { id: 'traverse', theme: 'avance', name: 'Traverse', scene: 'traverse', requires: ['pas-bouger', 'laisse'], steps: ['Au bord du trottoir, arrête-toi : il s’assoit.', 'Il te regarde : dis « traverse » et avancez ensemble.', 'Il descend avant le mot : demi-tour, on recommence. Toujours en laisse.'] },
  { id: 'pas-toucher', theme: 'avance', name: 'Pas toucher', scene: 'pas-toucher', requires: ['lache'], steps: ['Friandise dans ta main fermée : il renonce, récompense de l’autre main.', 'Puis friandise au sol sous ton pied, dis « pas toucher ».', 'Il te regarde au lieu de la viser : récompense.'] },
  { id: 'pied', theme: 'avance', name: 'Au pied', scene: 'pied', requires: ['laisse'], steps: ['Friandise contre ta jambe, dis « au pied ».', 'Trois pas à ta hauteur : friandise.', 'Ajoute des pas, puis des virages.'] },
  { id: 'panier', theme: 'avance', name: 'Au panier', scene: 'panier', requires: ['couche', 'pas-bouger'], steps: ['Lance une friandise sur son tapis, dis « au panier ».', 'Il s’y couche : récompense au sol.', 'Allonge le temps avant de le libérer.'] },
  { id: 'stop', theme: 'avance', name: 'Stop à distance', scene: 'stop', requires: ['rappel', 'pas-bouger'], steps: ['Pendant qu’il marche vers toi, main levée : « stop ».', 'Il s’arrête : va lui porter la friandise.', 'En longe d’abord, jamais près d’une route.'] },
  { id: 'patte', theme: 'avance', name: 'Donne la patte', scene: 'patte', requires: ['assis'], steps: ['Friandise dans ta main fermée, près du sol.', 'Il gratte avec la patte : « oui ! », friandise.', 'Présente ta main ouverte et dis « patte ».'] },
]

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)

export type SessionResult = 'difficile' | 'moyen' | 'reussi'

export const RESULTS: { value: SessionResult; label: string }[] = [
  { value: 'difficile', label: 'Difficile' },
  { value: 'moyen', label: 'Ça vient' },
  { value: 'reussi', label: 'Réussi' },
]

export type Status = 'a-decouvrir' | 'en-cours' | 'acquis'

export const STATUS_LABEL: Record<Status, string> = {
  'a-decouvrir': 'À découvrir',
  'en-cours': 'En cours',
  acquis: 'Acquis',
}

interface SessionLike {
  date: ISODate
  exerciseId: string
  result: SessionResult
  createdAt?: string
}

const newestFirst = <T extends { date: ISODate; createdAt?: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

/** « Acquis » après 3 séances réussies d'affilée (les plus récentes) ; « En cours » dès la première séance. */
export function exerciseStatus(sessions: SessionLike[], exerciseId: string): Status {
  const own = sessions.filter((s) => s.exerciseId === exerciseId).sort(newestFirst)
  if (own.length === 0) return 'a-decouvrir'
  const lastThree = own.slice(0, 3)
  return lastThree.length === 3 && lastThree.every((s) => s.result === 'reussi') ? 'acquis' : 'en-cours'
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

// ——— Maîtrise d'un ordre ———

const SCORE: Record<SessionResult, number> = { difficile: 0, moyen: 0.5, reussi: 1 }
const average = (results: SessionResult[]) => results.reduce((sum, r) => sum + SCORE[r], 0) / results.length

export interface Mastery {
  /** Nombre de séances notées. */
  count: number
  /** 0 à 100, sur les 5 dernières séances ; `undefined` sans séance. */
  percent?: number
  /** Évolution : les 3 dernières séances comparées aux 3 d'avant ; `undefined` avant 4 séances. */
  trend?: Trend
  /** Les 8 derniers résultats, du plus ancien au plus récent. */
  recent: SessionResult[]
}

/** Comment un ordre est appris, et s'il s'améliore ou se dégrade. */
export function mastery(sessions: SessionLike[], exerciseId: string): Mastery {
  const results = sessions
    .filter((s) => s.exerciseId === exerciseId)
    .sort(newestFirst)
    .reverse()
    .map((s) => s.result)
  if (results.length === 0) return { count: 0, recent: [] }
  const percent = Math.round(average(results.slice(-5)) * 100)
  let trend: Trend | undefined
  if (results.length >= 4) {
    const diff = average(results.slice(-3)) - average(results.slice(-6, -3))
    trend = diff >= 0.2 ? 'mieux' : diff <= -0.2 ? 'moins-bien' : 'stable'
  }
  return { count: results.length, percent, trend, recent: results.slice(-8) }
}

/** Un ordre « plus tard » est prêt quand tous ses prérequis sont acquis, ou dès qu'il a été travaillé une fois. */
export function isUnlocked(sessions: SessionLike[], exercise: Exercise): boolean {
  if (!exercise.requires?.length) return true
  if (sessions.some((s) => s.exerciseId === exercise.id)) return true
  return exercise.requires.every((id) => exerciseStatus(sessions, id) === 'acquis')
}
