import { diffDays, type ISODate } from './dates'
import { lateLabel } from './events'
import type { WalkBudget } from './walkBudget'
import { formatHour, timeToMinutes, walkName, WALK_SLOTS, type WalkSlot, type WalkTimes } from './walks'

// Aujourd’hui (spec V4 § 2) : une seule carte « À faire maintenant », choisie par une règle simple, et 2 lignes
// « Ensuite ». L’app propose, l’utilisateur confirme.

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
  /** Pesée du mois à proposer (T-013), avec la date de la dernière pesée. */
  weighing?: { due: boolean; last?: ISODate }
}

export type NowCard =
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

/** « Prochaine sortie à 19 h : d’ici là, 3 minutes de mission. » Sans l’heure qu’il est (le téléphone l’affiche déjà). Vide s’il n’y a rien à dire. */
export function contextLine(input: NowInput, card: NowCard): string {
  const walk = nextWalk(input)
  const mission = !input.mission.done && input.mission.minutes > 0 && card.kind !== 'soin' && card.kind !== 'repas' ? `${input.mission.minutes} minutes de mission` : ''
  if (walk && walk.in > 0) return `Prochaine sortie à ${formatHour(walk.time)}${mission ? ` : d’ici là, ${mission}.` : '.'}`
  if (mission) return `Il reste ${mission} aujourd’hui.`
  return card.kind === 'fini' ? 'Tout est fait pour aujourd’hui.' : ''
}

export interface NextLine {
  key: string
  /** Prévu à une date passée : la date reste affichée à gauche, en rouge (T-010). */
  late?: boolean
  when: string
  title: string
  detail: string
  to: string
}

/** « Ensuite » : la prochaine sortie et le prochain soin, 2 lignes au plus, sans répéter la carte du moment. */
export function nextLines(input: NowInput, card: NowCard): NextLine[] {
  const lines: NextLine[] = []
  const walk = nextWalk(input)
  const doneCount = WALK_SLOTS.filter((s) => input.walks.done[s.id]).length
  if (walk && !(card.kind === 'sortie' && card.slot === walk.slot)) {
    const length = input.budget ? (input.budget.next ? `${input.budget.next} min · ` : 'Juste ses besoins · ') : ''
    lines.push({ key: 'sortie', when: formatHour(walk.time), title: walkName(walk.time).replace(/^la s/, 'S'), detail: `${length}${doneCount} sur 3 faites`, to: '/' })
  }
  const upcoming = input.care
    .filter((e) => !e.done && e.date && !(card.kind === 'soin' && card.event.id === e.id))
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  if (upcoming && upcoming.date) {
    const days = diffDays(input.today, upcoming.date)
    lines.push({ key: upcoming.id, ...(days < 0 ? { late: true } : {}), when: days < 0 ? shortDate(upcoming.date) : days === 0 ? 'Aujourd’hui' : days === 1 ? 'Demain' : shortDate(upcoming.date), title: upcoming.title, detail: days < 0 ? lateLabel(upcoming.date, input.today) : days === 0 ? 'C’est le jour' : `Dans ${days} jour${days > 1 ? 's' : ''}`, to: `/evenement/${upcoming.id}` })
  }
  return lines.slice(0, 2)
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const shortDate = (iso: ISODate) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
