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
  /** Faite : sa durée (si la balade est importée). À venir : la durée conseillée (0 : juste ses besoins). */
  minutes?: number
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

export function walkDayPlan({ times, done, walks, budget, now }: { times: WalkTimes; done: Partial<Record<WalkSlot, string>>; /** Les balades du jour : leur créneau (si connu) et leur durée. */ walks: { slot?: string; minutes?: number }[]; budget?: WalkBudget; now: number }): WalkDayPlan {
  const upcoming = upcomingSlots(times, done, now)
  const slots = WALK_SLOTS.map(({ id }): WalkDaySlot => {
    const base = { slot: id, hour: formatHour(times[id]), name: walkName(times[id]).replace(/^la s/, 'S') }
    if (done[id]) {
      const minutes = walks.filter((w) => w.slot === id && w.minutes).reduce((sum, w) => sum + w.minutes!, 0)
      return { ...base, state: 'faite', ...(minutes ? { minutes: Math.round(minutes) } : {}) }
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
  if (!upcoming.length) tip = doneCount === 3 ? 'Ses 3 sorties sont faites, bravo !' : 'Plus d’autre sortie prévue aujourd’hui.'
  else if (!budget) tip = 'Une vraie sortie à chaque créneau, même 15 minutes.'
  else if (budget.next === 0) tip = `Ses ${minutesLabel(budget.daily)} de marche du jour sont faites : juste ses besoins, 5 minutes, au calme.`
  else if (budget.longWalk && budget.next < budget.perWalk) tip = 'Il a déjà beaucoup marché : sorties courtes et au calme. Laissez-le renifler, ça le fatigue autant qu’une longue marche.'
  else if (budget.next < budget.perWalk) tip = `Raccourcies pour ne pas dépasser ${minutesLabel(budget.daily)} sur la journée : ses articulations grandissent encore.`
  else tip = `${budget.perWalk} min par sortie : 5 min par mois d’âge, 3 fois par jour.`

  return { slots, walked, ...(budget ? { daily: budget.daily } : {}), summary, tip }
}

/** Les balades du jour (importées, de la Watch, de l'iPhone) : leur créneau et leur durée. */
export function walksOfDay(entries: { date: string; route?: { durationMin?: number }; walkSlot?: { date: string; creneau: string } }[], today: string): { slot?: string; minutes: number }[] {
  return entries.filter((e) => e.date === today && e.route?.durationMin).map((e) => ({ minutes: e.route!.durationMin!, ...(e.walkSlot?.date === today ? { slot: e.walkSlot.creneau } : {}) }))
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
