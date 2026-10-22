import { noteBone, type Bone, type BoneWithId } from './bones'
import type { ISODate } from './dates'
import type { Route, RouteMoment, RouteMomentType } from './route'

// « Que s’est-il passé ici ? » et « Raconter la balade » (spec V6 § 6.2). Fonctions pures.

/** Les 6 tuiles d’un arrêt ; « Autre » ouvre le choix complet (avec la note libre). */
export const STOP_TILES: { label: string; type: RouteMomentType | null }[] = [
  { label: 'Pipi', type: 'marque' },
  { label: 'Rencontre', type: 'rencontre' },
  { label: 'Reniflage', type: 'reniflage' },
  { label: 'Jeu', type: 'jeu' },
  { label: 'Moment de stress', type: 'peur' },
  { label: 'Autre', type: null },
]

/** Le repère posé sur un arrêt : à sa position, avec sa rue. Renvoie les repères de la balade avec le nouveau à la fin. */
export function momentOnStop(route: Pick<Route, 'stops' | 'moments'>, stopIndex: number, type: RouteMomentType, note?: string): RouteMoment[] | undefined {
  const stop = route.stops?.[stopIndex]
  if (!stop) return undefined
  return [...route.moments, { lat: stop.lat, lng: stop.lng, type, ...(note ? { note } : {}), ...(stop.street ? { street: stop.street } : {}) }]
}

/** Les arrêts à raconter, dans l’ordre : leur numéro dans la balade (1 pour le premier). */
export const stopsToTell = (route: Pick<Route, 'stops'>) => (route.stops ?? []).flatMap((s, i) => (s.momentIndex === undefined ? [i] : []))

/**
 * « C’est raconté ! » : +3 os une seule fois par balade (identifiant fixe, et `toldAt` sur la balade), dans la limite
 * des 3 notes du jour ; seulement si au moins un repère a été posé pendant le récit.
 */
export function tellBone(entryId: string, today: ISODate, bones: (Bone & { id?: string })[], { placed, toldAt }: { placed: number; toldAt?: ISODate }): BoneWithId | undefined {
  if (placed < 1 || toldAt) return undefined
  return noteBone(`raconte-${entryId}`, today, bones)
}
