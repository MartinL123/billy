import type { Bytes } from 'firebase/firestore'
import type { ISODate } from '../lib/dates'
import type { EventType } from '../lib/events'
import type { Feeding } from '../lib/feeding'
import type { Recurrence } from '../lib/recurrence'
import type { Decision } from '../lib/xp'
import type { Trait } from '../content/training'

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
  /** Traits du chien : ils adaptent le chemin du dressage, jamais les objectifs. */
  traits?: Trait[]
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

// ——— Dressage (docs/spec-v2-dressage.md) ———

export type { BossProgress } from '../lib/bossProgress'

/** users/{uid}/places/{id} — un lieu rattaché à un boss (« La ruelle » → La Ville). */
export interface Place {
  name: string
  bossId: string
  createdAt?: string
}

/** Distance approximative au déclencheur. Informative : elle ne rapporte jamais d'XP. */
export type DistanceBand = '<2' | '2-5' | '5-10' | '>10'

/** users/{uid}/sessions/{id} — une séance de 5 essais sur un exercice. */
export interface TrainingSession {
  date: ISODate
  exerciseId: string
  bossId: string
  /** Niveau de difficulté N1–N5 de l'exercice pendant la séance. */
  difficulty: number
  trials: boolean[]
  /** « A-t-il pris ses friandises ? » */
  ate: boolean
  /** Réaction 0–4 pendant la séance. */
  reaction?: number
  suggestion: Decision
  /** Ce que Martin a choisi : la suggestion n'est jamais appliquée d'office. */
  decision: Decision
  xp: number
  createdAt?: string
}

/** users/{uid}/exposures/{id} — une exposition à un déclencheur, voulue ou subie. */
export interface Exposure {
  date: ISODate
  bossId: string
  placeId?: string
  trigger: string
  distance?: DistanceBand
  /** 0 détendu · 1 attentif · 2 tendu · 3 bloqué · 4 panique. */
  reaction: number
  /** Retraite stratégique : demi-tour ou distance augmentée. */
  retreat: boolean
  xp: number
  createdAt?: string
}

export type XpKind = 'seance' | 'exposition' | 'repos' | 'validation' | 'palier' | 'etoile' | 'premiere' | 'quete'

/** users/{uid}/xpLog/{id} — journal d'XP, en ajout seul. Tout le reste (niveau, stats, radar) en découle. */
export interface XpEntry {
  date: ISODate
  kind: XpKind
  xp: number
  bossId?: string
  /** Libellé affiché (« Première exposition notée »). */
  label?: string
  /** Précision selon le type : `reniflage` ou `repos` pour un jour de récupération. */
  key?: string
  createdAt?: string
}

/** users/{uid}/quests/{lundi} — les quêtes de la semaine sont calculées ; seules celles remplacées sont notées. */
export interface QuestWeek {
  /** Lundi de la semaine. */
  date: ISODate
  replaced: string[]
}

/** Les anciens documents de `sessions` et `exposures` (avant la spec V2) n'ont pas ces champs : ils sont ignorés. */
export const isTrainingSession = (doc: Partial<TrainingSession>): doc is TrainingSession => Array.isArray(doc.trials) && typeof doc.bossId === 'string'
export const isExposure = (doc: Partial<Exposure>): doc is Exposure => typeof doc.reaction === 'number' && typeof doc.bossId === 'string'

export type WithId<T> = T & {
  id: string
  /** Écriture locale pas encore envoyée au serveur. */
  pending: boolean
}
