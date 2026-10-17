import type { ISODate } from './dates'
import { isHardMoment, readRoute, type Route, type StoredRoute } from './route'

// Toutes les balades et leurs filtres (carte-a-decouvrir.md § 7 bis). Un filtre change les trajets dessinés et la
// liste ; le brouillard, lui, reste calculé sur toutes les balades (on ne « reperd » jamais un territoire).

export type WalkFilter = 'toutes' | 'mois' | 'peur' | 'long'

export interface WalkItem {
  id: string
  date: ISODate
  name: string
  route: Route
  source?: string
  commune?: string
}

export function walkItems(entries: { id: string; date: ISODate; text: string; route?: StoredRoute; source?: string; commune?: string }[]): WalkItem[] {
  return entries
    .flatMap((e) => {
      const route = readRoute(e.route)
      return route && route.points.length > 1 ? [{ id: e.id, date: e.date, name: e.text.split('\n')[0] || 'Balade', route, ...(e.source ? { source: e.source } : {}), ...(e.commune ? { commune: e.commune } : {}) }] : []
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export const FILTERS: { id: WalkFilter; label: string }[] = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'mois', label: 'Ce mois' },
  { id: 'peur', label: 'Avec une peur' },
  { id: 'long', label: 'Plus de 3 km' },
]

export function filterWalks(items: WalkItem[], filter: WalkFilter, today: ISODate): WalkItem[] {
  if (filter === 'mois') return items.filter((w) => w.date.startsWith(today.slice(0, 7)))
  if (filter === 'peur') return items.filter((w) => w.route.moments.some(isHardMoment))
  if (filter === 'long') return items.filter((w) => w.route.distanceM > 3000)
  return items
}

/** « 12 balades · 18,4 km · 9 h 40 ensemble » */
export function walksSummary(items: WalkItem[]): string {
  const km = items.reduce((s, w) => s + w.route.distanceM, 0) / 1000
  const min = items.reduce((s, w) => s + (w.route.durationMin ?? 0), 0)
  const time = min ? ` · ${Math.floor(min / 60) ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`} ensemble` : ''
  return `${items.length} balade${items.length > 1 ? 's' : ''} · ${km.toFixed(1).replace('.', ',')} km${time}`
}
