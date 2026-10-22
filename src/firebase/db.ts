import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  deleteField,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './app'
import { newId, send, userCol, userDoc } from './paths'
import { deleteFile } from './files'
import { unshareMoment } from './community'
export { newId } from './paths'
import { lifeMilestones } from '../lib/milestones'
import type { RouteStop, StoredRoute } from '../lib/route'
import type { RoutePlace, RouteStreet } from '../lib/walkFacts'
import type { WalkWeather } from '../lib/walkHealth'
import type { BillyDocument, BillyEvent, Dog, Entry, Weight, WithId } from './types'
import { diffDays, todayISO, type ISODate } from '../lib/dates'
import { nextAfterDone, nextOccurrence } from '../lib/recurrence'
import { logEvent } from './journal'

// ——— Écoute en direct ———

export function watchCollection<T>(name: string, direction: 'asc' | 'desc', onData: (items: WithId<T>[]) => void): () => void {
  return onSnapshot(
    query(userCol(name), orderBy('date', direction)),
    { includeMetadataChanges: true },
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id, pending: d.metadata.hasPendingWrites }))),
    (error) => console.error(`Lecture de ${name} impossible`, error),
  )
}

/** Écoute une collection entière, sans tri (documents sans champ `date`). */
export function watchAll<T>(name: string, onData: (items: WithId<T>[]) => void): () => void {
  return onSnapshot(
    userCol(name),
    { includeMetadataChanges: true },
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id, pending: d.metadata.hasPendingWrites }))),
    (error) => console.error(`Lecture de ${name} impossible`, error),
  )
}

export function watchDog(onData: (dog: WithId<Dog> | null) => void): () => void {
  return onSnapshot(
    userDoc('dog', 'billy'),
    { includeMetadataChanges: true },
    (snap) => onData(snap.exists() ? { ...(snap.data() as Dog), id: snap.id, pending: snap.metadata.hasPendingWrites } : null),
    (error) => console.error('Lecture du profil impossible', error),
  )
}

// ——— Premier lancement ———

/** Les comptes n’ont plus de données de départ ; ce numéro marque qu’il n’y a rien à ajouter. */
const SEED_VERSION = 3

/**
 * Nouveau compte : un profil vide, rien d’autre. Vérifié sur le serveur pour ne jamais écraser un profil existant.
 * `seedVersion` est déjà à jour : aucune donnée de départ ne sera ajoutée plus tard.
 */
export async function ensureProfile(): Promise<void> {
  const dogRef = userDoc('dog', 'billy')
  // R-093 : une transaction, pas getDocFromServer + setDoc. Après une coupure au premier lancement, l’écouteur (et
  // getDocFromServer, qui passe par lui) peut dire le profil absent alors qu’il existe : setDoc l’écrasait alors en
  // boucle (des milliers d’écritures, marques de rattrapage effacées). La lecture d’une transaction va au serveur, et
  // l’écriture n’a lieu que si le profil n’y est vraiment pas.
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(dogRef)).exists()) return
    transaction.set(dogRef, { name: '', birthDate: '', breed: '', adoptionDate: '', seedVersion: SEED_VERSION } satisfies Dog)
  })
}

/**
 * Étapes de vie créées par le questionnaire : anniversaire, 6 mois, 1 an, anniversaire d’adoption.
 * Identifiants fixes : jamais de doublon, et un compte qui les a déjà n’est pas touché.
 */
export function ensureMilestones(events: WithId<BillyEvent>[], name: string, dates: { birth?: ISODate; adoption?: ISODate }, today: ISODate): void {
  const wanted = lifeMilestones(name, dates, today)
  const batch = writeBatch(db)
  let writes = 0
  for (const [id, event] of Object.entries(wanted)) {
    if (events.some((e) => e.id === id)) continue
    batch.set(userDoc('events', id), event)
    writes++
  }
  if (writes) send(batch.commit())
}

// ——— Profil ———

export function saveDog(dog: Dog): void {
  send(setDoc(userDoc('dog', 'billy'), dog as DocumentData))
}

/** Modifie quelques champs du profil sans toucher au reste. */
export function updateDog(patch: Partial<Dog>): void {
  send(updateDoc(userDoc('dog', 'billy'), patch as DocumentData))
}

/** Enregistre tout de suite une réponse du questionnaire de départ : on peut quitter et reprendre. */
export function answerQuestion(key: string, value: string, extra: Record<string, unknown> = {}): void {
  send(updateDoc(userDoc('dog', 'billy'), { [`questionnaire.answers.${key}`]: value, ...extra }))
}

// ——— Événements ———

/**
 * Questionnaire de départ : un soin déjà fait à une date donnée. S’il n’est pas déjà noté, il est ajouté comme fait,
 * avec son prochain rappel si aucun n’est prévu. Rien n’est jamais créé en double.
 */
export function recordCare(events: WithId<BillyEvent>[], care: { type: BillyEvent['type']; title: string; date: ISODate; recurrence: BillyEvent['recurrence']; match?: RegExp }): void {
  const own = events.filter((e) => e.type === care.type && (!care.match || care.match.test(e.title)))
  if (own.some((e) => e.done && e.date === care.date)) return
  const batch = writeBatch(db)
  const base = { title: care.title, type: care.type, recurrence: care.recurrence }
  const nextDate = own.some((e) => !e.done && e.date > care.date) ? undefined : nextOccurrence(care.date, care.recurrence)
  const nextId = nextDate ? newId('events') : undefined
  if (nextDate && nextId) batch.set(userDoc('events', nextId), { ...base, date: nextDate, done: false } satisfies BillyEvent)
  batch.set(userDoc('events', newId('events')), { ...base, date: care.date, done: true, doneAt: care.date, ...(nextId ? { nextId } : {}) } satisfies BillyEvent)
  send(batch.commit())
}

export function saveEvent(id: string, event: BillyEvent): void {
  send(setDoc(userDoc('events', id), event as DocumentData))
}

export function deleteEvent(event: WithId<BillyEvent>, documents: WithId<BillyDocument>[]): void {
  const batch = writeBatch(db)
  batch.delete(userDoc('events', event.id))
  // Les documents liés restent dans le profil, sans lien.
  for (const document of documents) {
    if (document.eventId === event.id) batch.update(userDoc('documents', document.id), { eventId: deleteField() })
  }
  send(batch.commit())
}

/**
 * Coche ou décoche « fait ». Cocher une occurrence récurrente crée la suivante, une seule fois ;
 * renvoie alors son identifiant (pour pouvoir annuler).
 */
export function setEventDone(event: WithId<BillyEvent>, done: boolean): string | undefined {
  const batch = writeBatch(db)
  const ref = userDoc('events', event.id)
  if (!done) {
    batch.update(ref, { done: false, doneAt: deleteField() })
    send(batch.commit())
    return undefined
  }
  // T-066 : journal privé, avec le retard (jours après la date prévue).
  logEvent({ type: 'care_done', lateDays: event.date ? Math.max(0, diffDays(event.date, todayISO())) : 0 })
  // En retard : fait aujourd’hui, la récurrence repart d’aujourd’hui (audit R-001).
  const nextDate = event.nextId ? undefined : nextAfterDone(event.date, event.recurrence, todayISO())
  const nextId = nextDate ? newId('events') : undefined
  if (nextDate && nextId) {
    const next: BillyEvent = {
      title: event.title,
      type: event.type,
      date: nextDate,
      time: event.time,
      recurrence: event.recurrence,
      notes: event.notes,
      done: false,
    }
    batch.set(userDoc('events', nextId), next as DocumentData)
    batch.update(ref, { done: true, doneAt: todayISO(), nextId })
  } else {
    batch.update(ref, { done: true, doneAt: todayISO() })
  }
  send(batch.commit())
  return nextId
}

/** Annule un « fait » tout juste coché, et retire l’occurrence suivante qu’il avait créée. */
export function undoEventDone(eventId: string, createdNextId: string | undefined): void {
  const batch = writeBatch(db)
  if (createdNextId) {
    batch.update(userDoc('events', eventId), { done: false, doneAt: deleteField(), nextId: deleteField() })
    batch.delete(userDoc('events', createdNextId))
  } else {
    batch.update(userDoc('events', eventId), { done: false, doneAt: deleteField() })
  }
  send(batch.commit())
}

// ——— Poids ———

export function saveWeight(id: string, weight: Weight): void {
  send(setDoc(userDoc('weights', id), weight))
}

export function deleteWeight(id: string): void {
  send(deleteDoc(userDoc('weights', id)))
}

// ——— Journal ———

/** Modifier le trajet d’un moment déjà noté. */
export function updateEntryRoute(id: string, route: StoredRoute): void {
  send(updateDoc(userDoc('entries', id), { route } as DocumentData))
}

/** V6 § 6.2 : la balade a été racontée (une fois). */
export function markWalkTold(id: string, date: ISODate): void {
  send(updateDoc(userDoc('entries', id), { toldAt: date }))
}

/** V6 § 2–3 : les arrêts, l’allure, le dénivelé et la météo d’une balade (seulement ces champs : le reste du trajet ne bouge pas). */
export function updateEntryStory(
  id: string,
  story: { stops?: RouteStop[]; pace?: number[]; ascentM?: number; descentM?: number; weather?: WalkWeather; weatherDetails?: Partial<WalkWeather>; streets?: RouteStreet[]; places?: RoutePlace[]; kmSplits?: number[]; maxSpeed?: number; cadence?: number },
): void {
  const patch: DocumentData = {}
  if (story.stops) patch['route.stops'] = story.stops
  if (story.pace) patch['route.pace'] = story.pace
  if (story.ascentM !== undefined) patch['route.ascentM'] = story.ascentM
  if (story.descentM !== undefined) patch['route.descentM'] = story.descentM
  if (story.weather) patch['route.weather'] = story.weather
  // T-102 : seulement les détails qui manquaient, champ par champ (la température notée par la Watch reste).
  for (const [k, v] of Object.entries(story.weatherDetails ?? {})) if (v !== undefined) patch[`route.weather.${k}`] = v
  if (story.streets) patch['route.streets'] = story.streets
  if (story.places) patch['route.places'] = story.places
  if (story.kmSplits) patch['route.kmSplits'] = story.kmSplits
  if (story.maxSpeed !== undefined) patch['route.maxSpeed'] = story.maxSpeed
  if (story.cadence !== undefined) patch['route.cadence'] = story.cadence
  if (Object.keys(patch).length) send(updateDoc(userDoc('entries', id), patch))
}

/** La commune d’une balade (Nominatim), gardée avec elle pour la liste « Ses balades ». */
export function setEntryCommune(id: string, commune: string): void {
  send(updateDoc(userDoc('entries', id), { commune }))
}

export function saveEntry(id: string, entry: Entry): void {
  send(setDoc(userDoc('entries', id), entry as DocumentData))
}

export function deleteEntry(entry: WithId<Entry>): void {
  send(deleteDoc(userDoc('entries', entry.id)))
  unshareMoment(entry.id)
  for (const photo of entry.photos) {
    deleteFile(photo.fileId)
    deleteFile(photo.thumbFileId)
  }
}

// ——— Documents ———

export function saveDocument(id: string, document: BillyDocument, previousEventId?: string): void {
  const batch = writeBatch(db)
  batch.set(userDoc('documents', id), document as DocumentData)
  if (previousEventId && previousEventId !== document.eventId) {
    batch.update(userDoc('events', previousEventId), { documentIds: arrayRemove(id) })
  }
  if (document.eventId) batch.update(userDoc('events', document.eventId), { documentIds: arrayUnion(id) })
  send(batch.commit())
}

export function updateDocumentMeta(id: string, patch: Partial<BillyDocument>): void {
  send(updateDoc(userDoc('documents', id), patch as DocumentData))
}

export function deleteDocument(document: WithId<BillyDocument>, eventExists: boolean): void {
  const batch = writeBatch(db)
  batch.delete(userDoc('documents', document.id))
  if (document.eventId && eventExists) {
    batch.update(userDoc('events', document.eventId), { documentIds: arrayRemove(document.id) })
  }
  send(batch.commit())
  for (const fileId of document.fileIds) deleteFile(fileId)
  deleteFile(document.thumbFileId)
}
