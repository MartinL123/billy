import { parisMinutes, type Activity } from './activity'
import { walkName } from './walks'

// Les marches de l'Apple Watch (app iOS, T-001) : lues dans Santé à chaque ouverture, elles passent par le même
// circuit que l'import d'un fichier GPX (brouillard, os, coche de la sortie). Ce fichier ne dépend ni de Capacitor ni
// de Firestore.

/** Une séance de marche lue dans Santé (voir `ios/App/App/FlairNativePlugin.swift`). */
export interface WatchWalk {
  uuid: string
  start: string
  end: string
  type: 'walking' | 'hiking'
  points: { lat: number; lng: number; time: string }[]
}

/** La première lecture remonte 30 jours en arrière. */
export const FIRST_SYNC_DAYS = 30
/** Une lecture recouvre la précédente d'un jour : une séance enregistrée par la montre après coup n'est pas perdue. */
export const OVERLAP_DAYS = 1
/** Au plus une lecture toutes les 5 minutes (ouverture, retour au premier plan). */
export const SYNC_EVERY_MS = 5 * 60 * 1000
/** Une balade déjà dans Flair qui part à moins de 5 minutes d'écart est la même (importée de Strava, par exemple). */
export const SAME_START_MS = 5 * 60 * 1000

const DAY_MS = 86_400_000

/** Depuis quand lire : la dernière lecture moins un jour, ou les 30 derniers jours la première fois. */
export function watchSince(syncedAt: string | undefined, now: Date): string {
  const last = syncedAt ? Date.parse(syncedAt) : NaN
  const from = Number.isNaN(last) ? now.getTime() - FIRST_SYNC_DAYS * DAY_MS : last - OVERLAP_DAYS * DAY_MS
  return new Date(from).toISOString()
}

/** Faut-il relire maintenant ? Pas plus d'une fois toutes les 5 minutes. */
export const shouldSync = (lastRun: number | undefined, now: number) => lastRun === undefined || now - lastRun >= SYNC_EVERY_MS

const MOMENTS: [number, string][] = [
  [5, 'de nuit'],
  [11, 'du matin'],
  [14, 'de midi'],
  [18, 'de l’après-midi'],
  [22, 'du soir'],
  [24, 'de nuit'],
]

/** « Balade du matin », « Randonnée de l’après-midi » : selon l'heure de départ à Paris, comme les noms de Strava. */
export function watchName(start: string, type: WatchWalk['type']): string {
  const hour = Math.floor(parisMinutes(start) / 60)
  const moment = MOMENTS.find(([until]) => hour < until)?.[1] ?? 'de nuit'
  return `${type === 'hiking' ? 'Randonnée' : 'Balade'} ${moment}`
}

/** Une séance de la Watch devient une activité, comme un fichier GPX lu. */
export function watchActivity(walk: WatchWalk): Activity {
  return { name: watchName(walk.start, walk.type), type: walk.type, points: walk.points.map((p) => ({ lat: p.lat, lng: p.lng, time: p.time })) }
}

/**
 * Les séances qui ne sont pas déjà dans Flair : une balade qui part à moins de 5 minutes d'écart est la même (déjà
 * importée de Strava, qui la tenait de la montre). Les doublons exacts sont écartés ensuite par la clé d'import.
 */
export function newWatchWalks(walks: WatchWalk[], known: { startTime?: string }[]): WatchWalk[] {
  const starts = known.map((k) => (k.startTime ? Date.parse(k.startTime) : NaN)).filter((t) => !Number.isNaN(t))
  return walks.filter((w) => {
    const start = Date.parse(w.points[0]?.time ?? w.start)
    return !starts.some((s) => Math.abs(s - start) < SAME_START_MS)
  })
}

/** « 2 balades de la Watch ajoutées » */
export const watchAddedLine = (count: number) => `${count} balade${count > 1 ? 's' : ''} de la Watch ajoutée${count > 1 ? 's' : ''}`

/**
 * Une balade de la Watch ou de l'iPhone rattachée à une sortie prend le nom de cette sortie (R-047) : partie à 14 h et
 * cochée comme sortie de l'après-midi (réglée à 14 h 30), c'est « Balade de l'après-midi », pas « Balade de midi ».
 */
export function slotWalkName(slotTime: string, name: string): string {
  const moment = walkName(slotTime).replace(/^la sortie /, '')
  return `${/^Randonnée/.test(name) ? 'Randonnée' : 'Balade'} ${moment}`
}
