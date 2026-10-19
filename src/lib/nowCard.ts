import type { ISODate } from './dates'
import type { WalkBudget } from './walkBudget'
import { timeToMinutes, WALK_SLOTS, type WalkSlot, type WalkTimes } from './walks'

// Aujourd’hui (spec V4 § 2) : une seule carte « À faire maintenant », choisie par une règle simple (les lignes
// « Ensuite » ont laissé la place aux tuiles de l’accueil, T-031). L’app propose, l’utilisateur confirme.

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
  | { kind: 'fini' }
  /** La mission est faite, plus de sortie à venir, mais toutes n’ont pas été faites. */
  | { kind: 'soir'; done: number }

const dueCare = (care: CareLike[], today: ISODate) =>
  care.filter((e) => !e.done && e.date && e.date <= today && (HOME_CARE.includes(e.type.toLowerCase()) || needsVet(e.type))).sort((a, b) => a.date.localeCompare(b.date))

/** Prochaine sortie pas encore faite, dont l’heure n’est pas passée depuis plus d’une heure. */
function nextWalk(input: NowInput): { slot: WalkSlot; time: string; in: number } | undefined {
  return WALK_SLOTS.map((s) => ({ slot: s.id, time: input.walks.times[s.id], in: timeToMinutes(input.walks.times[s.id]) - input.now }))
    .filter((w) => !input.walks.done[w.slot] && w.in > -60)
    .sort((a, b) => a.in - b.in)[0]
}

/** La carte, dans l’ordre de la spec : soin dû, repas dans 30 min, mission, sortie dans l’heure, sinon « tout est fait ». */
export function nowCard(input: NowInput): NowCard {
  if (input.walking) return { kind: 'balade', ...input.walking }
  const care = dueCare(input.care, input.today)[0]
  if (care) return { kind: 'soin', event: care }
  const meal = input.meals.find((m) => {
    const delta = timeToMinutes(m.time) - input.now
    return delta >= 0 && delta <= 30
  })
  if (meal) return { kind: 'repas', time: meal.time, ...(meal.label ? { label: meal.label } : {}) }
  if (!input.mission.done) return { kind: 'mission' }
  // La mission faite : la pesée du mois passe avant la prochaine sortie (T-013).
  if (input.weighing?.due) return { kind: 'pesee', ...(input.weighing.last ? { last: input.weighing.last } : {}) }
  // « Tout est fait » seulement si la mission et les sorties du jour sont faites (audit R-012).
  const walk = nextWalk(input)
  if (walk) return { kind: 'sortie', slot: walk.slot, time: walk.time }
  const done = WALK_SLOTS.filter((s) => input.walks.done[s.id]).length
  return done === WALK_SLOTS.length ? { kind: 'fini' } : { kind: 'soir', done }
}
