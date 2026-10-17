import { arrayUnion, deleteDoc, writeBatch } from 'firebase/firestore'
import { boneId, zonesBone } from '../lib/bones'
import type { ISODate } from '../lib/dates'
import { cellsAlong, countCells, knownCells, newCells, zoneBones } from '../lib/exploration'
import type { RoutePoint } from '../lib/route'
import { db } from './app'
import { send, userDoc } from './paths'
import type { ExplorationBlock, WithId } from './types'

/**
 * Ajoute au brouillard les cellules d'un tracé. Avec `reward`, verse les os de la balade (1 par zone, 50 au plus).
 * Renvoie le nombre de zones nouvelles et les os gagnés.
 */
export function discoverZones(points: RoutePoint[], known: WithId<ExplorationBlock>[], reward?: { entryId: string; date: ISODate }): { zones: number; bones: number } {
  const fresh = newCells(cellsAlong(points), knownCells(known))
  const zones = countCells(fresh)
  if (zones === 0) return { zones: 0, bones: 0 }
  const batch = writeBatch(db)
  for (const [block, cells] of fresh) batch.set(userDoc('exploration', block), { cells: arrayUnion(...cells) }, { merge: true })
  const bones = reward ? zoneBones(zones) : 0
  if (reward) {
    const gain = zonesBone(reward.entryId, reward.date, bones)
    batch.set(userDoc('bones', gain.id), { date: gain.date, amount: gain.amount, reason: gain.reason, refId: gain.refId })
  }
  send(batch.commit())
  return { zones, bones }
}

/** Les balades tracées avant l'exploration : leurs zones sont ajoutées une fois, sans os. */
export function backfillZones(routes: RoutePoint[][], known: WithId<ExplorationBlock>[], date: ISODate): number {
  const all = new Set(routes.flatMap((points) => [...cellsAlong(points)]))
  const fresh = newCells(all, knownCells(known))
  const batch = writeBatch(db)
  for (const [block, cells] of fresh) batch.set(userDoc('exploration', block), { cells: arrayUnion(...cells) }, { merge: true })
  batch.update(userDoc('dog', 'billy'), { explorationBackfilled: date })
  send(batch.commit())
  return countCells(fresh)
}


/** « Annuler » après Noter : les os des zones repartent (les zones, elles, restent découvertes). */
export function cancelZoneBones(entryId: string): void {
  send(deleteDoc(userDoc('bones', boneId('zone', entryId))))
}
