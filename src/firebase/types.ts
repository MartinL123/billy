import type { Bytes } from 'firebase/firestore'
import type { ISODate } from '../lib/dates'
import type { EventType } from '../lib/events'
import type { Feeding } from '../lib/feeding'
import type { Feeling } from '../lib/moment'
import type { Questionnaire } from '../lib/questionnaire'
import type { Recurrence } from '../lib/recurrence'
import type { Decision } from '../lib/xp'
import type { Trait } from '../content/training'

// Modèle de données de docs/specs/spec-v1.md. Tout champ ajouté après coup reste optionnel.

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
  /** Questionnaire de départ : chaque réponse est enregistrée au fur et à mesure. */
  questionnaire?: Questionnaire
  /** Ce qui lui fait peur (questionnaire). */
  fears?: string[]
  fearsOther?: string
  /** Compétences en cours choisies par le maître (3 au plus). Absent : l'app propose les 3 premières non maîtrisées. */
  activeSkills?: string[]
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
  // ——— Moment raconté (V3) : champs optionnels, une entrée du Journal reste valide sans eux ———
  /** Compétences travaillées, choisies par l'utilisateur. */
  skills?: string[]
  feeling?: Feeling
  /** « Il a eu peur ? » */
  fear?: boolean
  /** « On s'est éloignés pour qu'il se sente mieux. » */
  movedAway?: boolean
  /** Compétences où « oui, c'est réussi » a compté ce jour-là. */
  validations?: string[]
  xp?: number
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

// ——— Dressage (docs/specs/spec-v2-dressage.md) ———

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
  /** Boss principal de la séance. */
  bossId: string
  /** Tous les boss que l'exercice nourrit (le principal compris). Absent : seulement `bossId`. */
  bossIds?: string[]
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

export type XpKind = 'moment' | 'defi' | 'seance' | 'exposition' | 'repos' | 'validation' | 'palier' | 'etoile' | 'premiere' | 'quete'

/** users/{uid}/xpLog/{id} — journal d'XP, en ajout seul. Tout le reste (niveau, stats, radar) en découle. */
export interface XpEntry {
  date: ISODate
  kind: XpKind
  xp: number
  bossId?: string
  /** Séance d'un exercice qui nourrit plusieurs boss : l'XP compte pour chacun. */
  bossIds?: string[]
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

/** users/{uid}/dailyQuest/{date} — la quête du jour : ce qui a été fait, et combien de fois on a demandé une autre idée. */
export interface DailyQuestDoc {
  date: ISODate
  kind?: 'exercice' | 'revision' | 'repos'
  bossId?: string
  exerciseId?: string
  done: boolean
  skips: number
}
