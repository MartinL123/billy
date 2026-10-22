import type { ISODate } from './dates'
import { isHardMoment, readRoute, type Route, type StoredRoute } from './route'

// Toutes les balades et leurs filtres (carte-a-decouvrir.md § 7 bis). Un filtre change les trajets dessinés et la
// liste ; le brouillard, lui, reste calculé sur toutes les balades (on ne « reperd » jamais un territoire).

/** Les filtres ; `commune:Saint-Briac` pour une commune visitée. */
export type WalkFilter = 'toutes' | 'mois' | 'peur' | 'long' | `commune:${string}`

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
  if (filter.startsWith('commune:')) return items.filter((w) => w.commune === filter.slice(8))
  return items
}

/** Le résumé en chiffres (composant Stats, V6 § 1) : 12 balades · 18,4 km · 9 h 40 ensemble (sans durée connue, pas de temps). */
export function walksSummary(items: WalkItem[]): { value: string; label: string }[] {
  const km = items.reduce((s, w) => s + w.route.distanceM, 0) / 1000
  const min = items.reduce((s, w) => s + (w.route.durationMin ?? 0), 0)
  const out = [
    { value: String(items.length), label: items.length > 1 ? 'Balades' : 'Balade' },
    { value: `${km.toFixed(1).replace('.', ',')}\u00a0km`, label: 'Distance' },
  ]
  if (min) out.push({ value: Math.floor(min / 60) ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min}\u00a0min`, label: 'Ensemble' })
  return out
}

/** Les communes visitées, de la plus fréquente à la moins fréquente. */
export function communesOf(items: WalkItem[]): string[] {
  const counts = new Map<string, number>()
  for (const w of items) if (w.commune) counts.set(w.commune, (counts.get(w.commune) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name)
}

/** Étiquettes d’une ligne : d’où vient le trajet, et ses moments (« 1 peur », « Super rappel »). */
export function walkTags(item: WalkItem): string[] {
  const tags = [item.source === 'watch' || item.route.source === 'watch' ? 'Apple Watch' : item.source === 'gps' || item.route.source === 'gps' ? 'iPhone' : item.source === 'strava' || item.route.source ? 'Strava' : 'Tracé à la main']
  const fears = item.route.moments.filter((m) => m.type === 'peur' || m.type === 'grogne').length
  // Pas de chiffre hors du composant Stats sur les écrans de balade (V6 § 1).
  if (fears) tags.push(fears > 1 ? 'Des peurs' : 'Une peur')
  if (item.route.moments.some((m) => m.type === 'rappel')) tags.push('Super rappel')
  return tags
}

/**
 * Une couleur par balade, pour les distinguer sur la carte (vives, lisibles sur le plan comme sur le satellite,
 * avec un liseré blanc). Attribuée dans l’ordre chronologique : deux balades qui se suivent n’ont jamais la même couleur.
 * Une balade plus récente ne change pas la couleur des autres ; une balade plus ancienne, importée après coup, décale
 * celle des balades suivantes.
 */
// V6 § 1 : la première couleur est le vert des tracés (#2F8F6B) ; l’orange reste réservé à l’action.
export const WALK_COLORS = ['#2F8F6B', '#22B8F0', '#FF4FA3', '#9BD400', '#FFC21A', '#8C6BFF', '#00C99A', '#FF5A4E']

export function walkColors(items: WalkItem[]): Map<string, string> {
  const oldestFirst = [...items].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  return new Map(oldestFirst.map((w, i) => [w.id, WALK_COLORS[i % WALK_COLORS.length]!]))
}

/** Rayon d’un « coin » de balades (Saint-Ouen, la Bretagne…), en mètres (T-020). */
export const AREA_RADIUS_M = 25_000

const metersBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const rad = Math.PI / 180
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad)
  const y = (b.lat - a.lat) * rad
  return Math.sqrt(x * x + y * y) * 6_371_000
}

/**
 * Les balades du coin où l’on est (T-020) : celles qui partent à moins de 25 km. Sans balade dans le coin, toutes :
 * la carte n’est jamais vide.
 */
export function walksNear<T extends WalkItem>(items: T[], here: { lat: number; lng: number } | undefined): T[] {
  if (!here) return items
  const near = items.filter((w) => w.route.points[0] && metersBetween(here, { lat: w.route.points[0][0], lng: w.route.points[0][1] }) <= AREA_RADIUS_M)
  return near.length ? near : items
}
