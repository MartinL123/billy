import { distanceMeters } from './community'
import { formatShort, type ISODate } from './dates'
import type { Reaction } from './questionnaire'

// Les trajets de balade (docs/specs/trajets.md) : tracés après coup sur la carte, jamais suivis en direct.

/** Un point : [latitude, longitude]. */
export type RoutePoint = [number, number]

export type RouteMomentType = 'peur' | 'grogne' | 'rappel' | 'detendu' | 'marque'

export const ROUTE_MOMENTS: { id: Exclude<RouteMomentType, 'marque'>; label: string; color: string }[] = [
  { id: 'peur', label: 'A eu peur', color: '#C4423A' },
  { id: 'grogne', label: 'A grogné', color: '#9A4413' },
  { id: 'rappel', label: 'Super rappel', color: '#1E5A50' },
  { id: 'detendu', label: 'Bien détendu', color: '#2559A8' },
]
export const routeMomentInfo = (id: string) => ROUTE_MOMENTS.find((m) => m.id === id) ?? { id, label: 'A marqué', color: '#D9661F' }

export interface RouteMoment {
  lat: number
  lng: number
  type: RouteMomentType
  note?: string
  /** Nom de la rue, si OpenStreetMap le connaît. */
  street?: string
}

/** entries/{id}.route */
export interface Route {
  points: RoutePoint[]
  distanceM: number
  durationMin?: number
  savedRouteId?: string
  moments: RouteMoment[]
}

/** users/{uid}/routes/{id} : un trajet habituel. */
export interface SavedRoute {
  name: string
  points: RoutePoint[]
  distanceM: number
  lastUsedAt: string
}

export const MAX_SAVED_ROUTES = 20
export const DURATIONS = [15, 30, 45, 60]
export const durationLabel = (min: number) => (min >= 60 ? '1 h +' : `${min} min`)

const at = ([lat, lng]: RoutePoint) => ({ lat, lng })

/** Longueur du trajet : la somme des distances entre points (haversine). */
export function routeDistance(points: RoutePoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distanceMeters(at(points[i - 1]!), at(points[i]!))
  return total
}

/** « 1,8 km » ou « 650 m » */
export const formatRouteDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)

/** Points arrondis à 5 décimales (environ 1 m), sans doublons qui se suivent : quelques Ko par trajet. */
export function simplify(points: RoutePoint[]): RoutePoint[] {
  const out: RoutePoint[] = []
  for (const [lat, lng] of points) {
    const p: RoutePoint = [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]
    const last = out[out.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p)
  }
  return out
}

export const addPoint = (points: RoutePoint[], p: RoutePoint) => [...points, p]
export const removeLast = (points: RoutePoint[]) => points.slice(0, -1)
export const removeAt = (points: RoutePoint[], i: number) => points.filter((_, j) => j !== i)
export const moveAt = (points: RoutePoint[], i: number, p: RoutePoint) => points.map((q, j) => (j === i ? p : q))
/** « Revenir au départ » : ferme la boucle (rien à faire avec moins de 2 points, ou si c'est déjà fermé). */
export function closeLoop(points: RoutePoint[]): RoutePoint[] {
  if (points.length < 2) return points
  const first = points[0]!
  const last = points[points.length - 1]!
  return first[0] === last[0] && first[1] === last[1] ? points : [...points, first]
}

/** Distance d'un point au trajet (au segment le plus proche), en mètres, sur de petites distances. */
export function distanceToRoute(p: { lat: number; lng: number }, points: RoutePoint[]): number {
  if (points.length === 0) return Infinity
  if (points.length === 1) return distanceMeters(p, at(points[0]!))
  const k = Math.cos((p.lat * Math.PI) / 180)
  const xy = ([lat, lng]: RoutePoint) => [lng * k, lat]
  const [px, py] = [p.lng * k, p.lat]
  let best = Infinity
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = xy(points[i - 1]!)
    const [bx, by] = xy(points[i]!)
    const dx = bx! - ax!
    const dy = by! - ay!
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax!) * dx + (py - ay!) * dy) / (dx * dx + dy * dy))) : 0
    best = Math.min(best, distanceMeters(p, { lat: ay! + t * dy, lng: (ax! + t * dx) / k }))
  }
  return best
}

/** Toucher « près » du trajet : à moins de 40 m. */
export const NEAR_ROUTE = 40

/** Nom proposé : « Balade du 14 oct. » */
export const defaultRouteName = (date: ISODate) => `Balade du ${formatShort(date)}`

/** Reprendre un trajet habituel tel quel : mêmes points, même distance, sans moments. */
export const routeFromSaved = (id: string, saved: SavedRoute): Route => ({ points: saved.points, distanceM: saved.distanceM, savedRouteId: id, moments: [] })

/** Construire le trajet du moment à partir du tracé. */
export function buildRoute(points: RoutePoint[], moments: RouteMoment[], durationMin?: number, savedRouteId?: string): Route {
  const clean = simplify(points)
  return { points: clean, distanceM: Math.round(routeDistance(clean)), moments, ...(durationMin ? { durationMin } : {}), ...(savedRouteId ? { savedRouteId } : {}) }
}

/** Les trajets habituels à garder : au plus 20, les moins utilisés récemment partent en premier. */
export function routesToDrop<T extends { id: string; lastUsedAt: string }>(routes: T[]): string[] {
  return [...routes].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)).slice(MAX_SAVED_ROUTES).map((r) => r.id)
}

// Firestore refuse les tableaux de tableaux : on enregistre les points en { lat, lng }.
export type StoredPoint = { lat: number; lng: number }
export type StoredRoute = Omit<Route, 'points'> & { points: StoredPoint[] }
export type StoredSavedRoute = Omit<SavedRoute, 'points'> & { points: StoredPoint[] }
export const toStored = (points: RoutePoint[]): StoredPoint[] => points.map(([lat, lng]) => ({ lat, lng }))
export const fromStored = (points: StoredPoint[] | undefined): RoutePoint[] => (points ?? []).map((p) => [p.lat, p.lng])
export const storeRoute = (route: Route): StoredRoute => ({ ...route, points: toStored(route.points) })
export const readRoute = (route: StoredRoute | undefined): Route | undefined => (route ? { ...route, points: fromStored(route.points), moments: route.moments ?? [] } : undefined)

const lowerFirst = (text: string) => text.replace(/^./, (c) => c.toLocaleLowerCase('fr'))

/**
 * « A eu peur » / « A grogné » → une ligne de « Comment il réagit », seulement si on le choisit (trajets.md § 3).
 * La situation vient du mot noté, sinon de la rue : « Quand il passe rue de Lobau, il a peur. »
 */
export function momentReaction(moment: RouteMoment): Reaction | undefined {
  if (moment.type !== 'peur' && moment.type !== 'grogne') return undefined
  const note = moment.note?.trim().replace(/[.!]+$/, '')
  const situation = note ? lowerFirst(note) : moment.street ? `il passe ${lowerFirst(moment.street)}` : 'il est en balade'
  return { situation, reaction: 'peur' }
}

/** Déjà dans le profil ? */
export const hasReaction = (reactions: Reaction[] | undefined, reaction: Reaction) => (reactions ?? []).some((r) => r.situation === reaction.situation)

/** Un spot marqué ce jour-là à moins de 60 m du trajet devient un moment « A marqué » (communaute.md § 5). */
export const MARK_NEAR = 60

/** Ajoute les « A marqué » manquants ; renvoie le même trajet s'il n'y a rien à ajouter. */
export function withMarkMoments(route: Route, spots: { lat: number; lng: number; name: string }[]): Route {
  const added = spots
    .filter((s) => distanceToRoute(s, route.points) <= MARK_NEAR)
    .filter((s) => !route.moments.some((m) => m.type === 'marque' && m.lat === s.lat && m.lng === s.lng))
    .map((s): RouteMoment => ({ lat: s.lat, lng: s.lng, type: 'marque', note: s.name }))
  return added.length ? { ...route, moments: [...route.moments, ...added] } : route
}

/** Pour la carte « Ses balades » (trajets.md § 4) : les peurs et grognes d'un côté, les réussites de l'autre. */
export const isHardMoment = (m: RouteMoment) => m.type === 'peur' || m.type === 'grogne'
export const HARD_COLOR = '#C4423A'
export const GOOD_COLOR = '#1E5A50'

/** Les trajets du mois (« 2026-10 »), les plus anciens d'abord. */
export function walksOfMonth(entries: { date: ISODate; route?: StoredRoute }[], month: string): Route[] {
  return entries
    .filter((e) => e.route && e.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((e) => {
      const route = readRoute(e.route)
      return route && route.points.length > 1 ? [route] : []
    })
}
