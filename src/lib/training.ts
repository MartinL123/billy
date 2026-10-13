import { addDays, type ISODate } from './dates'

export type Theme = 'bases' | 'proprete' | 'socialisation'

export interface Exercise {
  id: string
  theme: Theme
  name: string
  /** Consigne courte affichée au moment de noter la séance. */
  tip: string
}

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'bases', label: 'Bases' },
  { value: 'proprete', label: 'Propreté' },
  { value: 'socialisation', label: 'Social.' },
]

// Les identifiants sont enregistrés dans les séances : ne jamais les renommer.
export const EXERCISES: Exercise[] = [
  { id: 'nom', theme: 'bases', name: 'Répondre à son nom', tip: 'Dis son nom une fois ; récompense dès qu’il te regarde.' },
  { id: 'assis', theme: 'bases', name: 'Assis', tip: 'Friandise au-dessus du nez, vers l’arrière. Récompense dès que les fesses touchent le sol.' },
  { id: 'couche', theme: 'bases', name: 'Couché', tip: 'Depuis assis, descends la friandise entre ses pattes avant.' },
  { id: 'pas-bouger', theme: 'bases', name: 'Pas bouger', tip: 'Un pas en arrière, reviens, récompense. Allonge la durée avant la distance.' },
  { id: 'rappel', theme: 'bases', name: 'Rappel', tip: 'Appelle-le d’une voix joyeuse, à courte distance, et fête son arrivée. Jamais pour le gronder.' },
  { id: 'laisse', theme: 'bases', name: 'Marche en laisse', tip: 'Laisse tendue : tu t’arrêtes. Laisse détendue : vous repartez. Récompense à hauteur de ta jambe.' },
  { id: 'lache', theme: 'bases', name: 'Lâche / Donne', tip: 'Échange l’objet contre une friandise, puis rends-le-lui quand c’est possible.' },
  { id: 'sortie-repas', theme: 'proprete', name: 'Sortie après le repas', tip: 'Sors-le dans le quart d’heure après chaque repas et félicite-le sur place.' },
  { id: 'sortie-reveil', theme: 'proprete', name: 'Sortie au réveil', tip: 'Dehors dès le réveil et après chaque sieste, avant tout le reste.' },
  { id: 'demande', theme: 'proprete', name: 'Demander à sortir', tip: 'Repère ses signaux (tourne, renifle, va vers la porte) et sors-le aussitôt.' },
  { id: 'nuit', theme: 'proprete', name: 'Nuit sans accident', tip: 'Dernière sortie tard, première sortie tôt. Note « Réussi » après une nuit propre.' },
  { id: 'seul', theme: 'socialisation', name: 'Rester seul', tip: 'Absences très courtes d’abord, sans cérémonie au départ ni au retour.' },
  { id: 'manipulations', theme: 'socialisation', name: 'Manipulations', tip: 'Pattes, oreilles, dents : quelques secondes, une friandise, on arrête avant qu’il s’agite.' },
  { id: 'chiens', theme: 'socialisation', name: 'Rencontres de chiens', tip: 'Chiens calmes et connus d’abord. Écourte si l’un des deux se fige.' },
  { id: 'bruits', theme: 'socialisation', name: 'Bruits de la ville', tip: 'Reste à une distance où il mange encore ses friandises, puis rapproche-toi au fil des jours.' },
  { id: 'voiture', theme: 'socialisation', name: 'Voiture', tip: 'Moteur éteint d’abord, puis trajets de quelques minutes vers un endroit agréable.' },
]

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
