import { getDocFromCache, writeBatch } from 'firebase/firestore'
import type { ImportedActivity } from '../lib/activity'
import { momentBones, noteBone, walkBone, type Bone, type BoneWithId } from '../lib/bones'
import type { ISODate } from '../lib/dates'
import { earnsBones } from '../lib/importPlan'
import { storeRoute } from '../lib/route'
import { trackForEntry } from '../lib/track'
import { parisMinutes } from '../lib/activity'
import { slotForStart, type WalkSlot, type WalkTimes } from '../lib/walks'
import { db } from './app'
import { newId, send, userDoc } from './paths'
import { isFirestoreCrash } from '../lib/firestoreCrash'
import { slotWalkName } from '../lib/watch'
import type { Entry } from './types'
import { logEvent } from './journal'

/**
 * Une balade importée devient un moment du Carnet (`source: 'strava'` ou `'watch'`), avec son trajet allégé. Elle compte comme une
 * balade notée (os de la note, 3 par jour au plus) seulement si elle date des 7 derniers jours. Renvoie son identifiant.
 */
/**
 * La balade coche la sortie de son créneau (spec V4 § 1 : plus de coche à la main) et en donne les os une fois,
 * seulement si elle date des 7 derniers jours.
 */
export function saveImportedWalk(walk: ImportedActivity, bones: Bone[], today: ISODate, times?: WalkTimes, source: 'strava' | 'watch' | 'gps' = 'strava'): { entryId: string; name: string; bones: Bone[] } {
  const entryId = newId('entries')
  const date = walk.date && walk.date <= today ? walk.date : today
  const minutes = walk.startTime ? parisMinutes(walk.startTime) : undefined
  const slot = times && minutes !== undefined ? slotForStart(times, minutes) : undefined
  // Watch ou iPhone : la balade prend le nom de la sortie qu’elle coche (R-047). Un nom Strava reste tel quel.
  const name = slot && times && source !== 'strava' ? slotWalkName(times[slot], walk.name) : walk.name
  const entry: Entry = {
    date,
    text: name,
    tags: [],
    photos: [],
    createdAt: new Date().toISOString(),
    source,
    importKey: walk.key,
    route: storeRoute({
      points: walk.points,
      distanceM: walk.distanceM,
      // T-086 : les « Repère » posés pendant la balade, « À raconter ».
      moments: walk.moments ?? [],
      source: source === 'strava' ? 'gpx' : source,
      ...(walk.durationMin ? { durationMin: walk.durationMin } : {}),
      ...(walk.startTime ? { startTime: walk.startTime } : {}),
      ...(walk.endTime ? { endTime: walk.endTime } : {}),
      ...(walk.stops ? { stops: walk.stops } : {}),
      ...(walk.pace ? { pace: walk.pace } : {}),
      // V6 § 2.1 : cœur, pas, dénivelé, météo, énergie, pauses (seulement ce que la source connaît).
      ...(walk.hr ? { hr: walk.hr } : {}),
      ...(walk.steps ? { steps: walk.steps } : {}),
      ...(walk.ascentM !== undefined ? { ascentM: walk.ascentM } : {}),
      ...(walk.descentM !== undefined ? { descentM: walk.descentM } : {}),
      ...(walk.weather ? { weather: walk.weather } : {}),
      ...(walk.energyKcal ? { energyKcal: walk.energyKcal } : {}),
      ...(walk.pauses ? { pauses: walk.pauses } : {}),
      // T-102 : km par km, vitesse max, cadence (rues, lieux et météo arrivent ensuite, en arrière-plan).
      ...(walk.kmSplits ? { kmSplits: walk.kmSplits } : {}),
      ...(walk.maxSpeed ? { maxSpeed: walk.maxSpeed } : {}),
      ...(walk.cadence ? { cadence: walk.cadence } : {}),
    }),
  }
  if (slot) entry.walkSlot = { date, creneau: slot }
  // Le trajet daté (V6 § 2.1), allégé si besoin pour que le document reste sous 900 Ko.
  const track = trackForEntry(walk.track, entry)
  if (track && entry.route) entry.route.track = track
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
  return { entryId, name, bones: gains }
}

/**
 * « Je l'ai faite » (R-044) : une sortie notée à la main, sans tracé. Elle coche la sortie, compte sa durée dans le
 * temps du jour et donne ses os une fois (même identifiant que pour une balade importée au même créneau : jamais en
 * double). Le brouillard ne bouge pas. Renvoie les os gagnés.
 */
export function noteWalk(walk: { date: ISODate; slot: WalkSlot; minutes: number; time: string }, bones: (Bone & { id: string })[], today: ISODate): BoneWithId[] {
  const batch = writeBatch(db)
  batch.set(userDoc('walks', walk.date), { date: walk.date, done: { [walk.slot]: walk.time }, noted: { [walk.slot]: walk.minutes } }, { merge: true })
  // +3 os, comme noter un moment (V5), dans la limite de 3 par jour.
  const gain = earnsBones(walk.date, today) ? noteBone(`sortie-${walk.date}-${walk.slot}`, walk.date, bones) : undefined
  const gains = gain ? [gain] : []
  for (const g of gains) batch.set(userDoc('bones', g.id), { date: g.date, amount: g.amount, reason: g.reason, refId: g.refId })
  send(batch.commit())
  logEvent({ type: 'walk_saved', source: 'sortie', min: walk.minutes })
  return gains
}

/**
 * La balade est-elle dans la base locale (R-045) ? Lecture sans réseau. Absente : faux. Firestore en panne : l'erreur
 * remonte (l'app se rechargera).
 */
export async function entryInLocalCache(id: string): Promise<boolean> {
  try {
    return (await getDocFromCache(userDoc('entries', id))).exists()
  } catch (error) {
    if (isFirestoreCrash(error)) throw error
    return false
  }
}
