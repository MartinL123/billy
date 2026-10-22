import { isValidISO, type ISODate } from './dates'
import type { Route } from './route'
import { effectiveTrack } from './trim'
import type { RoutePlace, RouteStreet } from './walkFacts'
import { walkMs } from './walkFacts'
import { placeOnWalk } from './walkPhotos'
import { windowOf } from './walkStory'

// T-107 (maquette flair-2026-10-22/Fiche) : ce que la fiche d’une balade calcule, en fonctions pures (testées).

type WalkRef = { id: string; date: ISODate; startTime?: string }

/**
 * Le numéro de la balade (« Balade n° 23 avec Billy ») : son rang, par heure de départ, parmi les balades faites
 * depuis l’adoption (date ≥ adoption). Sans date d’adoption : parmi toutes les balades. Une balade d’avant l’adoption
 * n’a pas de numéro.
 */
export function walkNumber(walks: WalkRef[], current: WalkRef, adoptionDate?: string): number | undefined {
  const since = adoptionDate && isValidISO(adoptionDate) ? adoptionDate : undefined
  if (since && current.date < since) return undefined
  const at = walkMs(current)
  const before = walks.filter((w) => w.id !== current.id && (!since || w.date >= since) && (walkMs(w) < at || (walkMs(w) === at && w.id < current.id)))
  return before.length + 1
}

/**
 * « Sans pause » : la plus longue période de marche sans arrêt (secondes), entre le départ, les arrêts détectés et
 * l’arrivée (recadrée : sur la portion gardée). Rien sans trajet daté ni arrêts calculés.
 */
export function longestWalkWithoutStop(route: Pick<Route, 'track' | 'trimmed' | 'stops'>): number | undefined {
  const track = effectiveTrack(route)
  if (!track || !route.stops || track.t.length < 2) return undefined
  const [a, b] = windowOf(track)
  let cursor = a
  let best = 0
  for (const stop of [...route.stops].sort((x, y) => x.at - y.at)) {
    const from = Math.max(a, stop.at)
    if (from > b) break
    best = Math.max(best, from - cursor)
    cursor = Math.max(cursor, Math.min(b, stop.at + stop.durS))
  }
  best = Math.max(best, b - cursor)
  return best > 0 ? Math.round(best) : undefined
}

/** Une ligne de « Le parcours » : une rue ou un lieu, et sa pastille (« nouvelle » en vert, « parc » en gris). */
export interface ParcoursRow {
  name: string
  tag?: 'nouvelle' | 'parc'
}

const GREEN_PLACES = new Set<RoutePlace['kind']>(['parc', 'square', 'jardin', 'canin'])
const key = (name: string) => name.trim().toLocaleLowerCase('fr')

/** « Le parcours » : les rues dans l’ordre (« nouvelle » si jamais vue), puis les lieux traversés pas déjà nommés. */
export function parcoursRows(streets: RouteStreet[], places: RoutePlace[]): ParcoursRow[] {
  const seen = new Set(streets.map((s) => key(s.name)))
  const rows: ParcoursRow[] = streets.map((s) => (s.new ? { name: s.name, tag: 'nouvelle' } : { name: s.name }))
  for (const p of places) {
    if (seen.has(key(p.name))) continue
    seen.add(key(p.name))
    rows.push(GREEN_PLACES.has(p.kind) ? { name: p.name, tag: 'parc' } : { name: p.name })
  }
  return rows
}

/** Une photo posée sur la carte de la fiche. */
export interface PhotoPin {
  index: number
  thumbFileId: string
  lat: number
  lng: number
}

/**
 * Les photos à poser sur la carte : là où elles ont été prises (position gardée, EXIF ou heure recoupée à l’import),
 * sinon leur heure de prise de vue recoupée avec le tracé. Une photo qu’on ne sait pas placer reste seulement en bas.
 */
export function photoPins(photos: { thumbFileId: string; lat?: number; lng?: number; time?: string }[], route: Pick<Route, 'points' | 'track' | 'startTime' | 'durationMin'>): PhotoPin[] {
  return photos.flatMap((p, index) => {
    if (p.lat !== undefined && p.lng !== undefined) return [{ index, thumbFileId: p.thumbFileId, lat: p.lat, lng: p.lng }]
    if (!p.time) return []
    const at = placeOnWalk({ time: p.time }, route)
    return at ? [{ index, thumbFileId: p.thumbFileId, lat: at.lat, lng: at.lng }] : []
  })
}
