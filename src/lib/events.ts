import { diffDays, type ISODate } from './dates'
import type { Recurrence } from './recurrence'

export type EventType = 'vaccin' | 'vermifuge' | 'antiparasitaire' | 'veto' | 'educateur' | 'sejour' | 'etape' | 'autre'

interface TypeInfo {
  label: string
  /** Titre pré-rempli quand on choisit ce type. */
  title: string
  color: string
  recurrence: Recurrence
}

export const EVENT_TYPES: Record<EventType, TypeInfo> = {
  vaccin: { label: 'Vaccin', title: 'Vaccin', color: '#2F6FD0', recurrence: 'yearly' },
  vermifuge: { label: 'Vermifuge', title: 'Vermifuge', color: '#7B4FC9', recurrence: 'quarterly' },
  antiparasitaire: { label: 'Antiparasitaire', title: 'Antiparasitaire', color: '#7B4FC9', recurrence: 'monthly' },
  veto: { label: 'Véto', title: 'RDV vétérinaire', color: '#C4423A', recurrence: 'none' },
  educateur: { label: 'Éducateur', title: "Séance avec l'éducateur", color: '#1E5A50', recurrence: 'none' },
  sejour: { label: 'Séjour', title: 'Séjour', color: '#8C9692', recurrence: 'none' },
  etape: { label: 'Étape', title: '', color: '#D9661F', recurrence: 'none' },
  autre: { label: 'Autre', title: '', color: '#8C9692', recurrence: 'none' },
}

export const EVENT_TYPE_ORDER: EventType[] = ['vaccin', 'vermifuge', 'antiparasitaire', 'veto', 'educateur', 'sejour', 'etape', 'autre']

export function typeInfo(type: string): TypeInfo {
  return EVENT_TYPES[type as EventType] ?? EVENT_TYPES.autre
}

interface Schedulable {
  date: ISODate
  time?: string
  done: boolean
}

export const isOverdue = (e: Schedulable, today: ISODate) => !e.done && !!e.date && diffDays(e.date, today) > 0

/** Événements non faits et datés : retards d'abord (du plus ancien au plus récent), puis à venir. */
export function upcoming<T extends Schedulable>(events: T[], today: ISODate): T[] {
  return events
    .filter((e) => !e.done && e.date)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .sort((a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today)))
}

// ——— Santé : filtrer par catégorie (spec V3 § 5.10) ———

export type CareFilter = 'tout' | 'soins' | 'vaccins' | 'veto' | 'educateur' | 'etapes'

export interface FilterInfo {
  id: CareFilter
  label: string
  color: string
  /** « 2 soins à venir » */
  one: string
  many: string
  /** Catégorie vide. */
  empty: string
  add: string
  /** Type pré-réglé du formulaire. */
  type?: EventType
}

export const CARE_FILTERS: FilterInfo[] = [
  { id: 'tout', label: 'Tout', color: '#18201E', one: 'événement à venir', many: 'événements à venir', empty: 'Rien de prévu pour l’instant', add: 'Ajouter un rendez-vous ou un soin' },
  { id: 'soins', label: 'Soins', color: '#7B4FC9', one: 'soin à venir', many: 'soins à venir', empty: 'Aucun soin à venir', add: 'Ajouter un soin', type: 'antiparasitaire' },
  { id: 'vaccins', label: 'Vaccins', color: '#2F6FD0', one: 'vaccin à venir', many: 'vaccins à venir', empty: 'Aucun vaccin à venir', add: 'Ajouter un vaccin', type: 'vaccin' },
  { id: 'veto', label: 'Véto', color: '#C4423A', one: 'rendez-vous véto à venir', many: 'rendez-vous véto à venir', empty: 'Aucun rendez-vous véto à venir', add: 'Ajouter un rendez-vous véto', type: 'veto' },
  { id: 'educateur', label: 'Éducateur', color: '#1E5A50', one: 'séance avec l’éducateur à venir', many: 'séances avec l’éducateur à venir', empty: 'Aucune séance avec l’éducateur à venir', add: 'Ajouter une séance avec l’éducateur', type: 'educateur' },
  { id: 'etapes', label: 'Étapes', color: '#D9661F', one: 'étape à venir', many: 'étapes à venir', empty: 'Aucune étape à venir', add: 'Ajouter une étape', type: 'etape' },
]

export const filterInfo = (id: string): FilterInfo => CARE_FILTERS.find((f) => f.id === id) ?? CARE_FILTERS[0]!

/** Catégorie d'un événement. Les anniversaires et « Billy a 6 mois / 1 an » sont des étapes. Séjours et autres : seulement dans « Tout ». */
export function eventCategory(event: { type: string; title: string }): CareFilter | undefined {
  if (event.type === 'etape' || /anniversaire/i.test(event.title)) return 'etapes'
  if (event.type === 'vaccin') return 'vaccins'
  if (event.type === 'vermifuge' || event.type === 'antiparasitaire') return 'soins'
  if (event.type === 'veto') return 'veto'
  if (event.type === 'educateur') return 'educateur'
  return undefined
}

export const matchesFilter = (event: { type: string; title: string }, filter: CareFilter) => filter === 'tout' || eventCategory(event) === filter

/** « 2 soins à venir », « 1 vaccin à venir ». */
export const filterSummary = (filter: CareFilter, count: number) => `${count} ${count > 1 ? filterInfo(filter).many : filterInfo(filter).one}`

/** La prochaine séance avec l'éducateur déjà prévue (pour pré-remplir le questionnaire). */
export function nextTrainerSession<E extends { type: string; date: string; time?: string; done: boolean }>(events: E[], today: string): E | undefined {
  return events.filter((e) => e.type === 'educateur' && !e.done && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
}

/**
 * Questionnaire « Avez-vous un éducateur ? » + prochaine séance : le rendez-vous à créer dans Santé, ou rien
 * (pas de date, date passée, ou une séance déjà prévue ce jour-là).
 */
export function trainerSession(events: { type: string; date: string; done: boolean }[], answer: { date: string; time?: string; name?: string }, today: string) {
  if (!answer.date || answer.date < today) return undefined
  if (events.some((e) => e.type === 'educateur' && !e.done && e.date === answer.date)) return undefined
  const name = answer.name?.trim()
  return {
    title: name ? `Séance avec ${name}` : EVENT_TYPES.educateur.title,
    type: 'educateur' as const,
    date: answer.date,
    ...(answer.time ? { time: answer.time } : {}),
    recurrence: 'none' as const,
    done: false,
  }
}
