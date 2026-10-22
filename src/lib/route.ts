import { distanceMeters } from './community'
import type { ISODate } from './dates'
import type { Reaction } from './questionnaire'
import { readTrack, type Track } from './track'

// Les trajets de balade (docs/specs/trajets.md) : tracés après coup sur la carte, jamais suivis en direct.

/** Un point : [latitude, longitude]. */
export type RoutePoint = [number, number]

export type RouteMomentType = 'peur' | 'grogne' | 'rencontre' | 'jeu' | 'marque' | 'rappel' | 'detendu' | 'note'

/**
 * Les repères d’une balade (trajets.md § 3, complétés par la fonction « Balades ») : « A eu peur » devient
 * « Moment de stress », « A marqué » devient « Pipi » (les anciens moments gardent leur identifiant).
 * Couleurs : blanc lisible dessus (contraste ≥ 3:1 pour l’icône).
 */
export const ROUTE_MOMENTS: { id: RouteMomentType; label: string; color: string }[] = [
  { id: 'peur', label: 'Moment de stress', color: '#C4423A' },
  { id: 'grogne', label: 'A grogné', color: '#9A4413' },
  { id: 'rencontre', label: 'Rencontre chien', color: '#7B4FC9' },
  { id: 'jeu', label: 'Jeu', color: '#C2531A' },
  { id: 'marque', label: 'Pipi', color: '#8A6514' },
  { id: 'rappel', label: 'Super rappel', color: '#1E5A50' },
  { id: 'detendu', label: 'Bien détendu', color: '#2559A8' },
  { id: 'note', label: 'Note libre', color: '#5C6662' },
]
export const routeMomentInfo = (id: string) => ROUTE_MOMENTS.find((m) => m.id === id) ?? ROUTE_MOMENTS[ROUTE_MOMENTS.length - 1]!

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
  /** Ancien « trajet habituel » repris (avant le 17 octobre) : gardé en lecture. */
  savedRouteId?: string
  moments: RouteMoment[]
  /** D’où vient le tracé : un fichier GPX (Strava), l’Apple Watch (Santé) ou le GPS de l’iPhone. Avec ses heures de début et de fin. */
  source?: 'gpx' | 'watch' | 'gps'
  startTime?: string
  endTime?: string
  // ——— V6 § 2.1 : tout est optionnel, les anciennes balades restent lisibles ———
  /** Le trajet daté (un point toutes les 5 s au plus) ; `points` reste pour la carte. */
  track?: Track
  /** Les arrêts (V6 § 3) : `at` en secondes depuis le départ. */
  stops?: RouteStop[]
  /** Vitesse moyenne par minute (km/h, 1 décimale). */
  pace?: number[]
  /** Rythme cardiaque par minute (bpm), Watch ou GPX ; privé. */
  hr?: number[]
  steps?: number
  ascentM?: number
  descentM?: number
  weather?: { tempC: number; humidity?: number; source: 'watch' | 'open-meteo' }
  energyKcal?: number
  /** Le début et la fin gardés après un recadrage (§ 8.3), en secondes depuis le départ. */
  trimmed?: { startS: number; endS: number }
}

/** Un arrêt de la balade (V6 § 3). */
export interface RouteStop {
  /** Secondes depuis le départ. */
  at: number
  durS: number
  lat: number
  lng: number
  /** La rue (Nominatim), ajoutée quand le réseau le permet. */
  street?: string
  /** Le repère posé à moins de 40 m de l’arrêt. */
  momentIndex?: number
}

export const durationLabel = (min: number) => (min >= 60 ? '1 h +' : `${min} min`)

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

/** Le point du trajet le plus proche (sur le segment le plus proche), sur de petites distances. */
export function nearestOnRoute(p: { lat: number; lng: number }, points: RoutePoint[]): { lat: number; lng: number } | null {
  if (points.length === 0) return null
  if (points.length === 1) return at(points[0]!)
  const k = Math.cos((p.lat * Math.PI) / 180)
  const xy = ([lat, lng]: RoutePoint) => [lng * k, lat]
  const [px, py] = [p.lng * k, p.lat]
  let best = Infinity
  let nearest = at(points[0]!)
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = xy(points[i - 1]!)
    const [bx, by] = xy(points[i]!)
    const dx = bx! - ax!
    const dy = by! - ay!
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax!) * dx + (py - ay!) * dy) / (dx * dx + dy * dy))) : 0
    const q = { lat: ay! + t * dy, lng: (ax! + t * dx) / k }
    const d = distanceMeters(p, q)
    if (d < best) {
      best = d
      nearest = q
    }
  }
  return nearest
}

/** Distance d’un point au trajet (au segment le plus proche), en mètres, sur de petites distances. */
export function distanceToRoute(p: { lat: number; lng: number }, points: RoutePoint[]): number {
  const q = nearestOnRoute(p, points)
  return q ? distanceMeters(p, q) : Infinity
}

/** Toucher « près » du trajet : à moins de 40 m. */
export const NEAR_ROUTE = 40

// Firestore refuse les tableaux de tableaux : on enregistre les points en { lat, lng }.
export type StoredPoint = { lat: number; lng: number }
export type StoredRoute = Omit<Route, 'points'> & { points: StoredPoint[] }
export const toStored = (points: RoutePoint[]): StoredPoint[] => points.map(([lat, lng]) => ({ lat, lng }))
export const fromStored = (points: StoredPoint[] | undefined): RoutePoint[] => (points ?? []).map((p) => [p.lat, p.lng])
export const storeRoute = (route: Route): StoredRoute => ({ ...route, points: toStored(route.points) })
export function readRoute(route: StoredRoute | undefined): Route | undefined {
  if (!route) return undefined
  const { track, ...rest } = route
  const read: Route = { ...rest, points: fromStored(route.points), moments: route.moments ?? [] }
  // Un trajet daté abîmé (colonnes de longueurs différentes) est ignoré, pas le reste de la balade.
  const valid = readTrack(track)
  if (valid) read.track = valid
  return read
}

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

/** Ajoute les « A marqué » manquants ; renvoie le même trajet s’il n’y a rien à ajouter. */
export function withMarkMoments(route: Route, spots: { lat: number; lng: number; name: string }[]): Route {
  const added = spots
    .filter((s) => distanceToRoute(s, route.points) <= MARK_NEAR)
    .filter((s) => !route.moments.some((m) => m.type === 'marque' && m.lat === s.lat && m.lng === s.lng))
    .map((s): RouteMoment => ({ lat: s.lat, lng: s.lng, type: 'marque', note: s.name }))
  return added.length ? { ...route, moments: [...route.moments, ...added] } : route
}

/** Pour la carte « Ses balades » (trajets.md § 4) : les peurs et grognes d’un côté, les réussites de l’autre. */
export const isHardMoment = (m: RouteMoment) => m.type === 'peur' || m.type === 'grogne'
/** Une note libre n’est ni une peur ni une réussite. */
export const isGoodMoment = (m: RouteMoment) => !isHardMoment(m) && m.type !== 'note'
export const HARD_COLOR = '#C4423A'
export const GOOD_COLOR = '#1E5A50'

/** Les trajets du mois (« 2026-10 »), les plus anciens d’abord. */
export function walksOfMonth(entries: { date: ISODate; route?: StoredRoute }[], month: string): Route[] {
  return entries
    .filter((e) => e.route && e.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((e) => {
      const route = readRoute(e.route)
      return route && route.points.length > 1 ? [route] : []
    })
}
