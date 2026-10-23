import { distanceMeters } from './community'
import { diffDays, type ISODate } from './dates'
import { walkMinutes } from './loops'
import type { NextHourWeather } from './openMeteo'
import type { WalkBudget } from './walkBudget'
import type { WalkItem } from './walkList'

// T-118 « 3 idées de balade » sur l’Accueil, quand c’est l’heure de sortir : trois de ses balades passées (aucun calcul
// d’itinéraire, 0 €), choisies pour le temps de marche qui reste aujourd’hui et la météo de l’heure qui vient. Variées
// (pas trois départs au même endroit) et pas refaites tout récemment. Fonctions pures, testées.

/** Au plus 3 idées. */
export const RECOS_MAX = 3
/** Sans règle des 5 minutes (chien adulte, date de naissance inconnue) : une sortie d’une demi-heure. */
export const DEFAULT_TARGET = 30
/** Deux idées « au même endroit » : départs à moins de 300 m. */
export const SAME_AREA_M = 300
/** Pluie, chaleur, froid : la durée visée raccourcit d’autant. */
export const SHORTER = 0.6
/** Beau temps : une idée peut aller jusqu’à 1,5 fois la durée visée. */
export const LONGER = 1.5

export type RecoWeather = 'pluie' | 'chaud' | 'froid' | 'beau' | 'normal'

/** Pluie attendue (0,2 mm, ou 60 % de risque), chaleur (27 °C et plus), froid (0 °C et moins), beau (12 à 24 °C, sec). */
export function recoWeather(w: NextHourWeather | undefined): RecoWeather | undefined {
  if (!w) return undefined
  if (w.rainMm >= 0.2 || (w.rainProb ?? 0) >= 60) return 'pluie'
  if (w.tempC >= 27) return 'chaud'
  if (w.tempC <= 0) return 'froid'
  if (w.tempC >= 12 && w.tempC <= 24 && (w.rainProb ?? 0) < 30) return 'beau'
  return 'normal'
}

/**
 * La durée visée (minutes) : ce qui reste du temps de marche du jour, réparti sur les sorties qui restent (la durée
 * conseillée de la prochaine sortie, `budget.next`) ; le temps du jour déjà fait : la durée prévue d’une sortie
 * (`perWalk`). Sans règle : une demi-heure.
 */
export function recoTarget(budget: WalkBudget | undefined): number {
  if (!budget) return DEFAULT_TARGET
  return budget.next > 0 ? budget.next : budget.perWalk
}

export interface WalkReco {
  item: WalkItem
  /** Durée estimée (minutes) : celle de la balade passée. */
  minutes: number
  /** Une phrase de météo (« Pluie prévue : une courte ») ; sans météo connue : rien. */
  hint?: string
  /** Beau temps : l’idée plus longue que la durée visée. */
  longer?: boolean
}

const start = (item: WalkItem) => ({ lat: item.route.points[0]![0], lng: item.route.points[0]![1] })

/** Faite il y a peu : un peu moins bien placée (2 jours ou moins : nettement ; moins d’une semaine : un peu). */
function recentPenalty(date: ISODate, today: ISODate): number {
  const days = diffDays(date, today)
  return days <= 2 ? 0.5 : days <= 6 ? 0.2 : 0
}

const SHORT_HINT: Partial<Record<RecoWeather, string>> = {
  pluie: 'Pluie prévue : une courte',
  chaud: 'Il fait chaud : une courte',
  froid: 'Il fait froid : une courte',
}

/**
 * Les idées : les balades passées dont la durée colle le mieux à la durée visée (raccourcie s’il pleut, fait trop chaud
 * ou trop froid), les moins récentes d’abord à écart égal, chacune partant d’un autre coin (sinon, faute de mieux, du
 * même). Beau temps : la dernière peut être plus longue (jusqu’à 1,5 fois). Triées de la plus courte à la plus longue.
 */
export function pickRecos(walks: WalkItem[], { target, weather, today }: { target: number; weather?: NextHourWeather; today: ISODate }): WalkReco[] {
  const kind = recoWeather(weather)
  const shorter = kind === 'pluie' || kind === 'chaud' || kind === 'froid'
  const aim = shorter ? Math.max(5, Math.round(target * SHORTER)) : target
  const all = walks
    .filter((w) => w.route.points.length > 1)
    .map((item) => ({ item, minutes: walkMinutes(item.route) }))
    .filter((c) => c.minutes > 0)
  const score = (c: { item: WalkItem; minutes: number }, goal: number) => Math.abs(c.minutes - goal) / goal + recentPenalty(c.item.date, today) + (shorter && c.minutes > target ? 1 : 0)
  const ranked = (goal: number, list = all) => [...list].sort((a, b) => score(a, goal) - score(b, goal) || a.item.date.localeCompare(b.item.date) || a.item.id.localeCompare(b.item.id))

  const picked: { item: WalkItem; minutes: number; longer?: boolean }[] = []
  const farFromPicked = (c: { item: WalkItem }) => picked.every((p) => distanceMeters(start(p.item), start(c.item)) >= SAME_AREA_M)
  const isPicked = (c: { item: WalkItem }) => picked.some((p) => p.item.id === c.item.id)
  // Beau temps : une place pour une plus longue.
  const longOnes = kind === 'beau' ? all.filter((c) => c.minutes > target && c.minutes <= target * LONGER) : []
  const room = RECOS_MAX - (longOnes.length ? 1 : 0)
  const order = ranked(aim)
  // D’abord des coins différents, puis, s’il en manque, les autres.
  for (const c of order) if (picked.length < room && farFromPicked(c)) picked.push(c)
  for (const c of order) if (picked.length < room && !isPicked(c)) picked.push(c)
  if (longOnes.length) {
    const rest = ranked(target * LONGER, longOnes).filter((c) => !isPicked(c))
    const long = rest.find(farFromPicked) ?? rest[0]
    if (long) picked.push({ ...long, longer: true })
    // Pas de plus longue disponible (déjà choisies) : une de plus, comme les autres.
    else for (const c of order) if (picked.length < RECOS_MAX && !isPicked(c)) picked.push(c)
  }

  const hintFor = (c: { minutes: number; longer?: boolean }): string | undefined => {
    if (!weather || !kind) return undefined
    if (c.longer) return 'Beau temps : une plus longue'
    if (shorter) return c.minutes <= target ? SHORT_HINT[kind] : kind === 'pluie' ? 'Pluie prévue' : `${weather.tempC} °C`
    return kind === 'beau' ? `${weather.tempC} °C, beau temps` : `${weather.tempC} °C`
  }
  return picked
    .sort((a, b) => a.minutes - b.minutes || a.item.id.localeCompare(b.item.id))
    .map((c) => {
      const hint = hintFor(c)
      return { item: c.item, minutes: c.minutes, ...(hint ? { hint } : {}), ...(c.longer ? { longer: true } : {}) }
    })
}
