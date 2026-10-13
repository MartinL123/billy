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
