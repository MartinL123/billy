import type { ISODate } from './dates'
import type { WalkBudget } from './walkBudget'
import { timeToMinutes, WALK_SLOTS, type WalkSlot, type WalkTimes } from './walks'

// La carte du moment (V5, T-050) : une seule carte en haut de l’accueil, qui suit le moment de la journée, choisie
// par une règle simple (la première qui s’applique). L’app propose, l’utilisateur confirme.

/** Soins qui se font à la maison, à heure fixe : ils passent avant tout le reste le jour où ils sont dus. */
const HOME_CARE = ['antiparasitaire', 'vermifuge', 'medicament', 'médicament']
/** Soins qui demandent le véto : la carte propose le rendez-vous (ou de l’appeler) le jour où ils sont dus. */
const VET_CARE = ['vaccin']
export const needsVet = (type: string) => VET_CARE.includes(type.toLowerCase())

export interface CareLike {
  id: string
  title: string
  type: string
  date: ISODate | ''
  done: boolean
}

export interface NowInput {
  today: ISODate
  /** Minutes depuis minuit. */
  now: number
  care: CareLike[]
  meals: { time: string; label?: string }[]
  mission: { done: boolean; minutes: number }
  walks: { times: WalkTimes; done: Partial<Record<WalkSlot, string>> }
  /** La règle des 5 minutes par mois d’âge (T-019) : durée de la prochaine sortie. */
  budget?: WalkBudget
  /** App iOS : une balade enregistrée par l’iPhone est commencée (T-036). `recording` faux si l’app a été fermée. */
  walking?: { startedAt: string; recording: boolean; /** Arrêtée (« Terminer » touché) mais pas encore enregistrée (R-042). */ stoppedAt?: string }
  /** Pesée du mois à proposer (T-013), avec la date de la dernière pesée. */
  weighing?: { due: boolean; last?: ISODate }
  /** Un souvenir est déjà noté aujourd’hui (le soir, la carte propose sinon d’en noter un). */
  notedToday?: boolean
}

export type NowCard =
  /** Une balade de l’iPhone en cours : la reprendre ou la terminer passe avant tout (T-036). */
  | { kind: 'balade'; startedAt: string; recording: boolean; stoppedAt?: string }
  | { kind: 'soin'; event: CareLike }
  | { kind: 'repas'; time: string; label?: string }
  | { kind: 'mission' }
  /** La pesée du mois, tant que le chien grandit (T-013). */
  | { kind: 'pesee'; last?: ISODate }
  | { kind: 'sortie'; slot: WalkSlot; time: string }
  /** Après 21 h, rien de noté aujourd’hui : « Racontez sa journée ». */
  | { kind: 'soiree' }
  /** Tout est fait : la dernière balade en souvenir (jamais de carte vide). */
  | { kind: 'fini' }

const dueCare = (care: CareLike[], today: ISODate) =>
  care.filter((e) => !e.done && e.date && e.date <= today && (HOME_CARE.includes(e.type.toLowerCase()) || needsVet(e.type))).sort((a, b) => a.date.localeCompare(b.date))

/** Une sortie s’annonce 30 min avant son heure et reste proposée jusqu’à 1 h après, tant qu’elle n’est pas notée. */
export const WALK_BEFORE_MIN = 30
export const WALK_AFTER_MIN = 60
/** À partir de 21 h, la carte propose de raconter la journée. */
export const EVENING_MIN = 21 * 60

/** La sortie du moment : pas encore notée, entre 30 min avant et 1 h après son heure (T-118 : aussi les idées de l’Accueil). */
export function walkNow(input: NowInput): { slot: WalkSlot; time: string } | undefined {
  return WALK_SLOTS.map((s) => ({ slot: s.id, time: input.walks.times[s.id], delta: input.now - timeToMinutes(input.walks.times[s.id]) }))
    .filter((w) => !input.walks.done[w.slot] && w.delta >= -WALK_BEFORE_MIN && w.delta <= WALK_AFTER_MIN)
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0]
}

/**
 * La carte, dans l’ordre (V5) : balade de l’iPhone en cours ; soin dû ou en retard ; repas dans les 30 min ; sortie du
 * moment ; mission du jour ; pesée du mois ; après 21 h sans souvenir, « Racontez sa journée » ; sinon « tout est fait ».
 */
export function nowCard(input: NowInput): NowCard {
  if (input.walking) return { kind: 'balade', ...input.walking }
  const care = dueCare(input.care, input.today)[0]
  if (care) return { kind: 'soin', event: care }
  const meal = input.meals.find((m) => {
    const delta = timeToMinutes(m.time) - input.now
    return delta >= 0 && delta <= 30
  })
  if (meal) return { kind: 'repas', time: meal.time, ...(meal.label ? { label: meal.label } : {}) }
  const walk = walkNow(input)
  if (walk) return { kind: 'sortie', slot: walk.slot, time: walk.time }
  if (!input.mission.done) return { kind: 'mission' }
  if (input.weighing?.due) return { kind: 'pesee', ...(input.weighing.last ? { last: input.weighing.last } : {}) }
  if (input.now >= EVENING_MIN && !input.notedToday) return { kind: 'soiree' }
  return { kind: 'fini' }
}
