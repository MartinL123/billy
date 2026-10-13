import type { Bytes } from 'firebase/firestore'
import type { ISODate } from '../lib/dates'
import type { EventType } from '../lib/events'
import type { Feeding } from '../lib/feeding'
import type { Recurrence } from '../lib/recurrence'
import type { SessionResult } from '../lib/training'

// Modèle de données de docs/spec-v1.md. Tout champ ajouté après coup reste optionnel.

export interface Contact {
  name: string
  phone: string
}

/** users/{uid}/dog/billy */
export interface Dog {
  name: string
  birthDate: ISODate
  breed: string
  adoptionDate: ISODate
  photoFileId?: string
  photoThumbFileId?: string
  chip?: string
  vet?: Contact
  trainer?: Contact
  /** Ration quotidienne et heures des repas. */
  feeding?: Feeding
  /** Version des données de départ déjà appliquées (voir seed.ts). */
  seedVersion?: number
}

/** users/{uid}/events/{id} — `date` vide = date à compléter. */
export interface BillyEvent {
  title: string
  type: EventType
  date: ISODate | ''
  time?: string
  recurrence: Recurrence
  notes?: string
  done: boolean
  doneAt?: ISODate
  documentIds?: string[]
  /** Occurrence suivante déjà créée (évite un doublon si on décoche puis recoche). */
  nextId?: string
}

/** users/{uid}/weights/{id} */
export interface Weight {
  date: ISODate
  kg: number
}

export interface EntryPhoto {
  fileId: string
  thumbFileId: string
}

/** users/{uid}/entries/{id} */
export interface Entry {
  date: ISODate
  text: string
  tags: string[]
  photos: EntryPhoto[]
  createdAt?: string
}

export type DocumentCategory = 'sante' | 'veto' | 'administratif' | 'autre'

/** users/{uid}/documents/{id} */
export interface BillyDocument {
  title: string
  category: DocumentCategory
  date: ISODate
  eventId?: string
  kind: 'pdf' | 'images'
  fileIds: string[]
  thumbFileId: string
  pageCount?: number
  size?: number
  createdAt?: string
}

/** users/{uid}/files/{id} — image : `data` ; PDF : `chunkCount` morceaux dans files/{id}/chunks/{n}. */
export interface StoredFile {
  mimeType: string
  size: number
  data?: Bytes
  chunkCount?: number
}

/** users/{uid}/sessions/{id} — une séance d'entraînement sur un exercice du programme. */
export interface TrainingSession {
  date: ISODate
  exerciseId: string
  result: SessionResult
  note?: string
  createdAt?: string
}

/** users/{uid}/exposures/{id} — une exposition à quelque chose qui fait peur à Billy. */
export interface Exposure {
  date: ISODate
  trigger: string
  /** 1 (serein) à 5 (panique). */
  fear: number
  /** Distance tolérée, en mètres. */
  distance?: number
  note?: string
  createdAt?: string
}

export type WithId<T> = T & {
  id: string
  /** Écriture locale pas encore envoyée au serveur. */
  pending: boolean
}
