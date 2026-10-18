import { diffDays, type ISODate } from './dates'
import { lateLabel } from './events'
import { formatHour, timeToMinutes, walkName, WALK_SLOTS, type WalkSlot, type WalkTimes } from './walks'

// Aujourd’hui (spec V4 § 2) : une seule carte « À faire maintenant », choisie par une règle simple, et 2 lignes
// « Ensuite ». L’app propose, l’utilisateur confirme.

/** Soins qui se font à la maison, à heure fixe : ils passent avant tout le reste le jour où ils sont dus. */
const HOME_CARE = ['antiparasitaire', 'vermifuge', 'medicament', 'médicament']

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
}

export type NowCard =
  | { kind: 'soin'; event: CareLike }
  | { kind: 'repas'; time: string; label?: string }
  | { kind: 'mission' }
  | { kind: 'sortie'; slot: WalkSlot; time: string }
  | { kind: 'fini' }
  /** La mission est faite, plus de sortie à venir, mais toutes n’ont pas été faites. */
  | { kind: 'soir'; done: number }

const dueCare = (care: CareLike[], today: ISODate) =>
  care.filter((e) => !e.done && e.date && e.date <= today && HOME_CARE.includes(e.type.toLowerCase())).sort((a, b) => a.date.localeCompare(b.date))

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
  // « Tout est fait » seulement si la mission et les sorties du jour sont faites (audit R-012).
  const walk = nextWalk(input)
  if (walk) return { kind: 'sortie', slot: walk.slot, time: walk.time }
  const done = WALK_SLOTS.filter((s) => input.walks.done[s.id]).length
  return done === WALK_SLOTS.length ? { kind: 'fini' } : { kind: 'soir', done }
}

/** « Il est 17 h 40. Prochaine sortie à 19 h : d’ici là, 3 minutes de mission. » */
export function contextLine(input: NowInput, card: NowCard): string {
  const h = Math.floor(input.now / 60)
  const m = input.now % 60
  const hour = `Il est ${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}.`
  const walk = nextWalk(input)
  const mission = !input.mission.done && input.mission.minutes > 0 && card.kind !== 'soin' && card.kind !== 'repas' ? `${input.mission.minutes} minutes de mission` : ''
  if (walk && walk.in > 0) return `${hour} Prochaine sortie à ${formatHour(walk.time)}${mission ? ` : d’ici là, ${mission}.` : '.'}`
  if (mission) return `${hour} Il reste ${mission} aujourd’hui.`
  return card.kind === 'fini' ? `${hour} Tout est fait pour aujourd’hui.` : hour
}

export interface NextLine {
  key: string
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
    lines.push({ key: 'sortie', when: formatHour(walk.time), title: walkName(walk.time).replace(/^la s/, 'S'), detail: `${doneCount} sur 3 faites`, to: '/' })
  }
  const upcoming = input.care
    .filter((e) => !e.done && e.date && !(card.kind === 'soin' && card.event.id === e.id))
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  if (upcoming && upcoming.date) {
    const days = diffDays(input.today, upcoming.date)
    lines.push({ key: upcoming.id, when: days < 0 ? 'En retard' : days === 0 ? 'Aujourd’hui' : days === 1 ? 'Demain' : shortDate(upcoming.date), title: upcoming.title, detail: days < 0 ? lateLabel(upcoming.date, input.today) : days === 0 ? 'C’est le jour' : `Dans ${days} jour${days > 1 ? 's' : ''}`, to: `/evenement/${upcoming.id}` })
  }
  return lines.slice(0, 2)
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const shortDate = (iso: ISODate) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
