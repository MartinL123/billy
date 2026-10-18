import { arrayUnion, getDocs, writeBatch } from 'firebase/firestore'
import type { ISODate } from '../lib/dates'
import { countFresh, FOG_COLLECTION, freshCells, knownFog, revealedCells } from '../lib/fog'
import { db } from './app'
import { send, userCol, userDoc } from './paths'
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
  for (const [zone, cells] of fresh) batch.set(userDoc(FOG_COLLECTION, zone), { cells: arrayUnion(...cells) }, { merge: true })
  if (!extra && fresh.size) send(batch.commit())
  return countFresh(fresh)
}

/**
 * Une seule fois par compte (et à chaque changement de grille) : tous les trajets enregistrés lèvent le brouillard
 * de la grille actuelle. Les cases de l’ancienne grille de 50 m (`fog/`) sont ensuite effacées.
 */
export function backfillFog(tracks: LatLng[][], known: WithId<FogZone>[], date: ISODate): number {
  const batch = writeBatch(db)
  const count = revealFog(tracks, known, { batch })
  batch.update(userDoc('dog', 'billy'), { fog25Backfilled: date })
  send(batch.commit())
  void getDocs(userCol('fog')).then((old) => {
    if (old.empty) return
    const clean = writeBatch(db)
    old.forEach((d) => clean.delete(d.ref))
    send(clean.commit())
  })
  return count
}
