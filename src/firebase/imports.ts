import { writeBatch } from 'firebase/firestore'
import type { ImportedActivity } from '../lib/activity'
import { momentBones, walkBone, type Bone } from '../lib/bones'
import type { ISODate } from '../lib/dates'
import { earnsBones } from '../lib/importPlan'
import { storeRoute } from '../lib/route'
import { parisMinutes } from '../lib/activity'
import { slotForStart, type WalkTimes } from '../lib/walks'
import { db } from './app'
import { newId, send, userDoc } from './paths'
import type { Entry } from './types'

/**
 * Une balade importée devient un moment du Carnet (`source: 'strava'`), avec son trajet allégé. Elle compte comme une
 * balade notée (os de la note, 3 par jour au plus) seulement si elle date des 7 derniers jours. Renvoie son identifiant.
 */
/**
 * La balade coche la sortie de son créneau (spec V4 § 1 : plus de coche à la main) et en donne les os une fois,
 * seulement si elle date des 7 derniers jours.
 */
export function saveImportedWalk(walk: ImportedActivity, bones: Bone[], today: ISODate, times?: WalkTimes): { entryId: string; bones: Bone[] } {
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
  const minutes = walk.startTime ? parisMinutes(walk.startTime) : undefined
  const slot = times && minutes !== undefined ? slotForStart(times, minutes) : undefined
  if (slot) entry.walkSlot = { date, creneau: slot }
  const batch = writeBatch(db)
  batch.set(userDoc('entries', entryId), entry)
  const recent = earnsBones(walk.date, today)
  const gains = recent ? momentBones(entryId, date, [], [], bones) : []
  if (slot && minutes !== undefined) {
    const hhmm = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    batch.set(userDoc('walks', date), { date, done: { [slot]: hhmm } }, { merge: true })
    if (recent) gains.push(walkBone(date, slot))
  }
  for (const gain of gains) batch.set(userDoc('bones', gain.id), { date: gain.date, amount: gain.amount, reason: gain.reason, refId: gain.refId })
  send(batch.commit())
  return { entryId, bones: gains }
}
