import { Bytes, collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore'
import type { BoneWithId } from '../lib/bones'
import type { CalmLevel, CalmSlot, SpotCategory } from '../lib/community'
import type { ISODate } from '../lib/dates'
import { db } from './app'
import { send, uid } from './paths'

// Données communes de la meute : community/meute/… Lisibles par tout compte connecté de l'app ;
// chacun ne modifie que ce qu'il a créé (firestore.rules). Jamais d'heure, jamais de position en direct.

export const packCol = (name: string) => collection(db, 'community', 'meute', name)
export const packDoc = (name: string, id: string) => doc(db, 'community', 'meute', name, id)

/** community/meute/members/{uid} : le profil public d'un chien (ni santé, ni documents, ni Carnet). */
export interface Member {
  dogName: string
  breed?: string
  birthDate?: ISODate
  level: number
  /** Étapes acquises par compétence, pour ses badges. */
  badges: Record<string, number>
  color: string
  /** Miniature de sa photo (copie légère, la photo d'origine reste privée). */
  thumb?: Bytes
  photoFileId?: string
  updatedAt: string
}

export interface Spot {
  name: string
  category: SpotCategory
  lat: number
  lng: number
  info: string[]
  createdBy: string
  createdAt: string
}

export interface Mark {
  spotId: string
  uid: string
  dogName: string
  /** Le jour seulement, jamais l'heure. */
  date: ISODate
}

export interface CalmVote {
  level: CalmLevel
  slot: CalmSlot
  date: ISODate
}

export interface FeedItem {
  uid: string
  dogName: string
  text: string
  date: ISODate
  skills?: string[]
  /** Miniature (400 px) de la première photo, si le maître la partage. */
  photo?: Bytes
}

export interface ChallengeRow {
  dogName: string
  color: string
  /** Jours de la semaine où la mission a été faite. */
  days: ISODate[]
}

export type WithId<T> = T & { id: string }
const listen = <T>(name: string, onData: (items: WithId<T>[]) => void) =>
  onSnapshot(packCol(name), (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))), () => undefined)

export const watchMembers = (onData: (items: WithId<Member>[]) => void) => listen<Member>('members', onData)
export const watchSpots = (onData: (items: WithId<Spot>[]) => void) => listen<Spot>('spots', onData)
export const watchMarks = (onData: (items: WithId<Mark>[]) => void) => listen<Mark>('marks', onData)
export const watchFeed = (onData: (items: WithId<FeedItem>[]) => void) => listen<FeedItem>('feed', onData)
export const watchCalm = (spotId: string, onData: (items: WithId<CalmVote>[]) => void) =>
  onSnapshot(collection(db, 'community', 'meute', 'spots', spotId, 'calm'), (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as CalmVote), id: d.id }))), () => undefined)

export function saveMember(member: Member): void {
  send(setDoc(packDoc('members', uid()), member))
}

/** Un nouveau spot : un lieu public, jamais un domicile. Renvoie son identifiant. */
export function addSpot(spot: Omit<Spot, 'createdBy' | 'createdAt'>): string {
  const ref = doc(packCol('spots'))
  send(setDoc(ref, { ...spot, createdBy: uid(), createdAt: new Date().toISOString() } satisfies Spot))
  return ref.id
}

export function voteCalm(spotId: string, vote: CalmVote): void {
  send(setDoc(doc(db, 'community', 'meute', 'spots', spotId, 'calm', uid()), vote))
}

/** Marquer un spot : la marque (une par spot et par jour) et ses os, en une seule écriture. */
export function markSpot(id: string, mark: Mark, gain: BoneWithId): void {
  const batch = writeBatch(db)
  batch.set(packDoc('marks', id), mark)
  batch.set(doc(db, 'users', uid(), 'bones', gain.id), { date: gain.date, amount: gain.amount, reason: gain.reason, refId: gain.refId })
  send(batch.commit())
}

const feedId = (entryId: string) => `${uid()}_${entryId}`

/** Le moment est-il partagé avec la meute ? (en direct) */
export const watchShared = (entryId: string, onData: (shared: boolean) => void) =>
  onSnapshot(packDoc('feed', feedId(entryId)), (snap) => onData(snap.exists()), () => onData(false))

/** Retirer un moment partagé (« Vous pourrez le retirer »). */
export function unshareMoment(entryId: string): void {
  send(deleteDoc(packDoc('feed', feedId(entryId))))
}

export function shareMoment(entryId: string, item: Omit<FeedItem, 'uid'>): void {
  send(setDoc(packDoc('feed', feedId(entryId)), { ...item, uid: uid() } satisfies FeedItem))
}

/** Supprimer un compte retire de la meute son profil, ses marques, ses moments partagés, ses avis et ses lignes de défi. */
export async function leavePack(me: string): Promise<void> {
  const mine = async (name: string) => (await getDocs(query(packCol(name), where('uid', '==', me)))).docs.map((d) => d.ref)
  const refs = [...(await mine('marks')), ...(await mine('feed')), packDoc('members', me)]
  for (const spot of (await getDocs(packCol('spots'))).docs) refs.push(doc(db, 'community', 'meute', 'spots', spot.id, 'calm', me))
  for (const week of (await getDocs(collection(db, 'community', 'meute', 'challenges'))).docs) refs.push(doc(db, 'community', 'meute', 'challenges', week.id, 'rows', me))
  for (const ref of refs) await deleteDoc(ref).catch(() => undefined)
}
