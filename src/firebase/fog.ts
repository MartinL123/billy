import { arrayUnion, writeBatch } from 'firebase/firestore'
import type { ISODate } from '../lib/dates'
import { countFresh, freshCells, knownFog, revealedCells } from '../lib/fog'
import { db } from './app'
import { send, userDoc } from './paths'
import type { FogZone, WithId } from './types'

type LatLng = { lat: number; lng: number }

/**
 * Lève le brouillard sur un ou plusieurs trajets (points complets) : les cases nouvelles rejoignent `fog/{zone}`
 * par arrayUnion. Renvoie le nombre de cases découvertes. Aucun os ici : une balade rapporte ses os une fois.
 */
export function revealFog(tracks: LatLng[][], known: WithId<FogZone>[], extra?: { batch: ReturnType<typeof writeBatch> }): number {
  const found = new Set<string>()
  for (const track of tracks) for (const cell of revealedCells(track)) found.add(cell)
  const fresh = freshCells(found, knownFog(known))
  const batch = extra?.batch ?? writeBatch(db)
  for (const [zone, cells] of fresh) batch.set(userDoc('fog', zone), { cells: arrayUnion(...cells) }, { merge: true })
  if (!extra && fresh.size) send(batch.commit())
  return countFresh(fresh)
}

/** Une seule fois par compte : les anciens trajets du Carnet (y compris tracés à la main) lèvent le brouillard. */
export function backfillFog(tracks: LatLng[][], known: WithId<FogZone>[], date: ISODate): number {
  const batch = writeBatch(db)
  const count = revealFog(tracks, known, { batch })
  batch.update(userDoc('dog', 'billy'), { fogBackfilled: date })
  send(batch.commit())
  return count
}
