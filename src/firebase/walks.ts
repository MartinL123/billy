import { deleteField, setDoc } from 'firebase/firestore'
import { walkBone } from '../lib/bones'
import type { ISODate } from '../lib/dates'
import type { WalkSlot } from '../lib/walks'
import { send, userDoc } from './paths'

/** Coche une sortie (heure du tap) et gagne +2 os, une seule fois par créneau et par jour. */
export function markWalk(date: ISODate, slot: WalkSlot, time: string): void {
  send(setDoc(userDoc('walks', date), { date, done: { [slot]: time } }, { merge: true }))
  const gain = walkBone(date, slot)
  send(setDoc(userDoc('bones', gain.id), { date: gain.date, amount: gain.amount, reason: gain.reason, refId: gain.refId }))
}

/** Décoche une sortie touchée par erreur. Les os ne sont jamais retirés. */
export function unmarkWalk(date: ISODate, slot: WalkSlot): void {
  send(setDoc(userDoc('walks', date), { date, done: { [slot]: deleteField() } }, { merge: true }))
}
