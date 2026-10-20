import { minutesLabel, walkBudget, type WalkBudget } from './walkBudget'
import { formatHour, timeToMinutes, walkName, WALK_SLOTS, type WalkSlot, type WalkTimes } from './walks'

// « Ses sorties du jour » (T-035) : les 3 sorties avec leur durée (faite ou conseillée), le temps de marche du jour et
// un conseil. Les chiffres se lisent d'un coup : ce qui est fait, ce qui reste, pourquoi.

/** Une sortie dont l'heure est passée depuis plus d'une heure sans être faite : manquée, elle ne compte plus. */
const MISSED_AFTER = 60

export type WalkDayState = 'faite' | 'a-venir' | 'manquee'

export interface WalkDaySlot {
  slot: WalkSlot
  /** « 8 h ». */
  hour: string
  /** « Sortie du matin ». */
  name: string
  state: WalkDayState
  /** Faite : sa durée (balade importée, ou notée). À venir : la durée conseillée (0 : juste ses besoins). */
  minutes?: number
  /** Faite et notée à la main, sans tracé (R-044). */
  noted?: boolean
}

export interface WalkDayPlan {
  slots: WalkDaySlot[]
  /** Minutes déjà marchées aujourd'hui. */
  walked: number
  /** Le temps de marche du jour (règle des 5 minutes), si elle s'applique. */
  daily?: number
  /** « 34 min sur 1 h 15 · encore 2 sorties de 20 min ». */
  summary: string
  /** Un conseil pour la suite. */
  tip: string
}

/** Les sorties encore à venir : ni faites, ni manquées. */
export function upcomingSlots(times: WalkTimes, done: Partial<Record<WalkSlot, string>>, now: number): WalkSlot[] {
  return WALK_SLOTS.map((s) => s.id).filter((slot) => !done[slot] && timeToMinutes(times[slot]) - now > -MISSED_AFTER)
}

export function walkDayPlan({ times, done, walks, budget, now }: { times: WalkTimes; done: Partial<Record<WalkSlot, string>>; /** Les balades du jour : leur créneau (si connu) et leur durée. */ walks: { slot?: string; minutes?: number; noted?: boolean }[]; budget?: WalkBudget; now: number }): WalkDayPlan {
  const upcoming = upcomingSlots(times, done, now)
  const slots = WALK_SLOTS.map(({ id }): WalkDaySlot => {
    const base = { slot: id, hour: formatHour(times[id]), name: walkName(times[id]).replace(/^la s/, 'S') }
    if (done[id]) {
      const own = walks.filter((w) => w.slot === id && w.minutes)
      const minutes = own.reduce((sum, w) => sum + w.minutes!, 0)
      return { ...base, state: 'faite', ...(minutes ? { minutes: Math.round(minutes) } : {}), ...(own.length && own.every((w) => w.noted) ? { noted: true } : {}) }
    }
    if (upcoming.includes(id)) return { ...base, state: 'a-venir', ...(budget ? { minutes: budget.next } : {}) }
    return { ...base, state: 'manquee' }
  })
  const walked = budget ? budget.walked : Math.round(walks.reduce((sum, w) => sum + (w.minutes ?? 0), 0))
  const doneCount = slots.filter((s) => s.state === 'faite').length

  // Le résumé : fait, puis ce qui reste.
  const made = budget ? `${minutesLabel(walked)} sur ${minutesLabel(budget.daily)}` : walked ? `${minutesLabel(walked)} de marche` : `${doneCount} sur 3 faites`
  const rest = !upcoming.length ? '' : budget ? (budget.next ? `encore ${upcoming.length === 1 ? `1 sortie de ${budget.next} min` : `${upcoming.length} sorties de ${budget.next} min`}` : 'juste ses besoins') : `encore ${upcoming.length} sortie${upcoming.length > 1 ? 's' : ''}`
  // Espaces insécables : « 25 min » ne se coupe pas en fin de ligne.
  const summary = (rest ? `${made} · ${rest}` : made).replace(/(\d) (min|h|sur|sorties?)/g, '$1\u00a0$2')

  let tip: string
  if (!upcoming.length) tip = doneCount === 3 ? 'Ses 3 sorties sont faites, bravo !' : 'Plus d’autre sortie prévue aujourd’hui.'
  else if (!budget) tip = 'Une vraie sortie à chaque créneau, même 15 minutes.'
  else if (budget.next === 0) tip = `Ses ${minutesLabel(budget.daily)} de marche du jour sont faites : juste ses besoins, 5 minutes, au calme.`
  else if (budget.longWalk && budget.next < budget.perWalk) tip = 'Il a déjà beaucoup marché : sorties courtes et au calme. Laissez-le renifler, ça le fatigue autant qu’une longue marche.'
  else if (budget.next < budget.perWalk) tip = `Raccourcies pour ne pas dépasser ${minutesLabel(budget.daily)} sur la journée : ses articulations grandissent encore.`
  else tip = `${budget.perWalk} min par sortie : 5 min par mois d’âge, 3 fois par jour.`

  return { slots, walked, ...(budget ? { daily: budget.daily } : {}), summary, tip }
}

/**
 * Les balades du jour (importées, de la Watch, de l'iPhone) : leur créneau et leur durée ; puis les sorties notées à
 * la main (R-044), seulement si aucune balade n'occupe déjà leur créneau (la balade remplace la sortie notée).
 */
export function walksOfDay(entries: { date: string; route?: { durationMin?: number }; walkSlot?: { date: string; creneau: string } }[], today: string, noted: Partial<Record<WalkSlot, number>> = {}): { slot?: string; minutes: number; noted?: boolean }[] {
  const walks: { slot?: string; minutes: number; noted?: boolean }[] = entries.filter((e) => e.date === today && e.route?.durationMin).map((e) => ({ minutes: e.route!.durationMin!, ...(e.walkSlot?.date === today ? { slot: e.walkSlot.creneau } : {}) }))
  const withWalk = new Set(entries.filter((e) => e.date === today && e.walkSlot?.date === today).map((e) => e.walkSlot!.creneau))
  for (const { id } of WALK_SLOTS) {
    const minutes = noted[id]
    if (minutes && !withWalk.has(id)) walks.push({ slot: id, minutes, noted: true })
  }
  return walks
}

/** Les durées proposées pour noter une sortie (R-044) ; « Autre » pour le reste. */
export const DURATION_CHOICES = [10, 15, 25, 40, 60]

/** La durée présélectionnée : la plus proche de la durée d'une sortie à son âge (R-046 : 15 min à 3 mois), 25 min sans règle. */
export function preselectedDuration(advised: number | undefined): number {
  const target = advised && advised > 0 ? advised : 25
  return DURATION_CHOICES.reduce((best, m) => (Math.abs(m - target) < Math.abs(best - target) ? m : best))
}

/** Le matin (avant midi), les sorties non faites d'hier restent notables (R-044). */
export function yesterdayOpenSlots(done: Partial<Record<WalkSlot, string>>, now: number): WalkSlot[] {
  return now < 12 * 60 ? WALK_SLOTS.map((s) => s.id).filter((slot) => !done[slot]) : []
}

/**
 * Le budget de marche du jour, le même partout (accueil, carte du moment, résultat d'import : audit R-038) : ce qui
 * reste se répartit sur les sorties encore à venir, jamais sur celles manquées.
 */
export function dayBudget({ birthDate, today, times, done, walks, now }: { birthDate?: string; today: string; times: WalkTimes; done: Partial<Record<WalkSlot, string>>; walks: { minutes: number }[]; now: number }): WalkBudget | undefined {
  return walkBudget({ birthDate, today, walks: walks.map((w) => w.minutes), walksLeft: upcomingSlots(times, done, now).length })
}

/** Minutes depuis minuit, à l'heure du téléphone. */
export const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes()

/**
 * « Grosse balade aujourd'hui… » après un import (R-049) : seulement si une balade du jour dépasse la durée d'une
 * sortie ET que la prochaine sortie est vraiment raccourcie. Sinon, rien (15 min, c'est la durée normale à 3 mois).
 */
export function bigWalkNotice(budget: WalkBudget | undefined, longWalkToday: boolean): string | undefined {
  if (!budget?.longWalk || !longWalkToday || budget.next >= budget.perWalk) return undefined
  const rest = budget.next ? `La prochaine sortie : ${budget.next} min suffisent.` : 'Pour le reste du jour, juste des sorties de 5 min pour ses besoins.'
  return `Grosse balade aujourd’hui (${minutesLabel(budget.longWalk)}, au lieu de ${budget.perWalk} à ${budget.months} mois). ${rest}`
}

/**
 * La phrase sous les 3 pastilles (V5, T-050) : ce qui reste, et la durée conseillée. Plus de barre ni de total.
 * « Encore la sortie du soir : 15 min conseillées. » / « Encore 2 sorties, 15 min conseillées chacune. » /
 * « Toutes ses sorties sont faites. Belle journée pour Oslo ! »
 */
export function walksSentence(slots: WalkDaySlot[], advised: number | undefined, dogName: string): string {
  const left = slots.filter((s) => s.state !== 'faite')
  if (!left.length) return `Toutes ses sorties sont faites. Belle journée pour ${dogName} !`
  const length = advised === undefined ? '' : advised ? `${advised} min conseillées` : 'juste ses besoins'
  if (left.length === 1) {
    const name = left[0]!.name.charAt(0).toLocaleLowerCase('fr') + left[0]!.name.slice(1)
    return length ? `Encore la ${name} : ${length}.` : `Encore la ${name}.`
  }
  if (!length) return `Encore ${left.length} sorties.`
  return advised ? `Encore ${left.length} sorties, ${length} chacune.` : `Encore ${left.length} sorties : ${length}.`
}
