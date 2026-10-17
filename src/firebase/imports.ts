import { writeBatch } from 'firebase/firestore'
import type { ImportedActivity } from '../lib/activity'
import { momentBones, type Bone } from '../lib/bones'
import type { ISODate } from '../lib/dates'
import { earnsBones } from '../lib/importPlan'
import { storeRoute } from '../lib/route'
import { db } from './app'
import { newId, send, userDoc } from './paths'
import type { Entry } from './types'

/**
 * Une balade importée devient un moment du Carnet (`source: 'strava'`), avec son trajet allégé. Elle compte comme une
 * balade notée (os de la note, 3 par jour au plus) seulement si elle date des 7 derniers jours. Renvoie son identifiant.
 */
export function saveImportedWalk(walk: ImportedActivity, bones: Bone[], today: ISODate): { entryId: string; bones: Bone[] } {
  const entryId = newId('entries')
  const date = walk.date && walk.date <= today ? walk.date : today
  const entry: Entry = {
    date,
    text: walk.name,
    tags: [],
    photos: [],
    createdAt: new Date().toISOString(),
    source: 'strava',
    importKey: walk.key,
    route: storeRoute({
      points: walk.points,
      distanceM: walk.distanceM,
      moments: [],
      source: 'gpx',
      ...(walk.durationMin ? { durationMin: walk.durationMin } : {}),
      ...(walk.startTime ? { startTime: walk.startTime } : {}),
    }),
  }
  const batch = writeBatch(db)
  batch.set(userDoc('entries', entryId), entry)
  const gains = earnsBones(walk.date, today) ? momentBones(entryId, date, [], [], bones) : []
  for (const gain of gains) batch.set(userDoc('bones', gain.id), { date: gain.date, amount: gain.amount, reason: gain.reason, refId: gain.refId })
  send(batch.commit())
  return { entryId, bones: gains }
}
