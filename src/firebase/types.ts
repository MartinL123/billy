import type { Bytes } from 'firebase/firestore'
import type { ISODate } from '../lib/dates'
import type { EventType } from '../lib/events'
import type { Feeding } from '../lib/feeding'
import type { Feeling } from '../lib/moment'
import type { Questionnaire, Reaction } from '../lib/questionnaire'
import type { StoredRoute } from '../lib/route'
import type { Recurrence } from '../lib/recurrence'
import type { Decision } from '../lib/xp'
import type { Trait } from '../content/training'
import type { WalkTimes } from '../lib/walks'

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
  /** R-069 : les fichiers existants ont reçu leur `kind` (photo ou document), ce jour-là. */
  filesKindBackfilled?: ISODate
  chip?: string
  vet?: Contact
  trainer?: Contact
  /** Ration quotidienne et heures des repas. */
  feeding?: Feeding
  /** App iOS : les notifications locales voulues (T-042). Absent : soins et récap oui, sorties non. `balade` (T-084) : balade de la Watch arrivée, oui par défaut. */
  notifications?: { soin?: boolean; sortie?: boolean; recap?: boolean; balade?: boolean }
  /** Heures des 3 sorties du jour (Profil › Sorties). Absent : 8 h, 13 h, 19 h. */
  walkTimes?: Partial<WalkTimes>
  /** Traits du chien : ils adaptent le chemin du dressage, jamais les objectifs. */
  traits?: Trait[]
  /** Questionnaire de départ : chaque réponse est enregistrée au fur et à mesure. */
  questionnaire?: Questionnaire
  /** Ce qui lui fait peur (questionnaire). */
  fears?: string[]
  fearsOther?: string
  // ——— Questionnaire de départ en 5 parties : tous ces champs sont optionnels ———
  sex?: string
  neutered?: string
  /** Élevage, refuge ou association, particulier, autre. */
  origin?: string
  vaccineName?: string
  rabies?: string
  antiparasiteType?: string
  /** Traitement ou souci de santé à surveiller. */
  healthNotes?: string
  allergies?: string
  foodType?: string
  foodBrand?: string
  treats?: string
  games?: string[]
  housing?: string
  garden?: string
  aloneTime?: string
  walksPerDay?: string
  household?: string
  /** « Quand [situation], il est [réaction]. » */
  reactions?: Reaction[]
  /** À la maison, il est plutôt calme, joueur, très excité. */
  homeMood?: string
  /** Ce que le chien porte (boutique). */
  cosmetics?: Cosmetics
  /** Le mot de passe donné par Martin a été changé, ou la proposition fermée. */
  passwordPromptDone?: boolean
  /** Os rétroactifs déjà versés (le jour où c’est fait). */
  bonesBackfilled?: ISODate
  /** Ancienne exploration (geohash, 14-17 octobre) : plus lue, gardée. */
  explorationBackfilled?: ISODate
  /** Anciens trajets du Carnet déjà passés dans le brouillard (une seule fois). */
  fogBackfilled?: ISODate
  /** Le brouillard recalculé sur la grille de 25 m. */
  fog25Backfilled?: ISODate
  /** Compétences en cours choisies par le maître (3 au plus). Absent : l’app propose les 3 premières non maîtrisées. */
  activeSkills?: string[]
  /** Calculé à la lecture, jamais enregistré : le nom n’a pas encore été donné (on affiche « Votre chien »). */
  unnamed?: boolean
  /** Ancien marqueur des données de départ. Plus aucune n’est appliquée ; conservé pour les comptes existants. */
  seedVersion?: number
  /** T-103 : « Retrouver les photos de mes balades » (app iOS) : vrai si accepté, faux si refusé ; absent : pas encore demandé. */
  walkPhotos?: boolean
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
  /** Où elle a été prise sur la balade (EXIF ou heure de la trace GPX), si on le sait. */
  lat?: number
  lng?: number
  /** T-103 : l’heure de prise de vue (ISO), pour une photo retrouvée dans la photothèque après la balade. */
  time?: string
  /** T-103 : ajoutée seule depuis la photothèque (« Annuler » la retire). */
  auto?: boolean
}

/** users/{uid}/entries/{id} */
export interface Entry {
  date: ISODate
  text: string
  tags: string[]
  photos: EntryPhoto[]
  createdAt?: string
  // ——— Moment raconté (V3) : champs optionnels, une entrée du Journal reste valide sans eux ———
  /** Compétences travaillées, choisies par l’utilisateur. */
  skills?: string[]
  feeling?: Feeling
  /** « Il a eu peur ? » */
  fear?: boolean
  /** « On s’est éloignés pour qu’il se sente mieux. » */
  movedAway?: boolean
  /** Compétences où « oui, c’est réussi » a compté ce jour-là. */
  validations?: string[]
  xp?: number
  /** Le trajet de la balade (docs/specs/trajets.md). */
  route?: StoredRoute
  /** Balade importée : fichier Strava (carte-a-decouvrir.md § 6), Apple Watch ou GPS de l’iPhone (app iOS). */
  source?: 'strava' | 'watch' | 'gps'
  /** Clé de doublon : heure de départ + premier point. */
  importKey?: string
  /** Commune du premier point (Nominatim), gardée avec la balade. */
  commune?: string
  /** La sortie du jour à laquelle la balade est rattachée. */
  walkSlot?: { date: ISODate; creneau: string }
  /** « Raconter la balade » mené au bout (V6 § 6.2), ce jour-là : ses +3 os ne sont donnés qu’une fois. */
  toldAt?: ISODate
  /** T-103 : le dernier nom calculé seul (moment + lieu marquant) ; un autre texte est un nom choisi, qui reste. */
  autoName?: string
  /** T-103 : la photothèque a été parcourue pour cette balade (une seule fois). */
  photosSearchedAt?: string
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

/** Ce qu’un fichier contient : une photo (souvenir, profil) ou une page de document (privée, R-069). */
export type FileKind = 'photo' | 'document'

/** users/{uid}/files/{id} — image : `data` ; PDF : `chunkCount` morceaux dans files/{id}/chunks/{n}. */
export interface StoredFile {
  mimeType: string
  size: number
  data?: Bytes
  chunkCount?: number
  /** R-069 : un visiteur ne lit que les photos. Absent sur les fichiers d’avant (rattrapé une fois, FilesKindBackfill). */
  kind?: FileKind
}

// ——— Dressage (docs/specs/spec-v2-dressage.md) ———

export type { BossProgress } from '../lib/bossProgress'

/** users/{uid}/places/{id} — un lieu rattaché à un boss (« La ruelle » → La Ville). */
export interface Place {
  name: string
  bossId: string
  createdAt?: string
}

/** Distance approximative au déclencheur. Informative : elle ne rapporte jamais d’XP. */
export type DistanceBand = '<2' | '2-5' | '5-10' | '>10'

/** users/{uid}/sessions/{id} — une séance de 5 essais sur un exercice. */
export interface TrainingSession {
  date: ISODate
  exerciseId: string
  /** Boss principal de la séance. */
  bossId: string
  /** Tous les boss que l’exercice nourrit (le principal compris). Absent : seulement `bossId`. */
  bossIds?: string[]
  /** Niveau de difficulté N1–N5 de l’exercice pendant la séance. */
  difficulty: number
  trials: boolean[]
  /** « A-t-il pris ses friandises ? » */
  ate: boolean
  /** Réaction 0–4 pendant la séance. */
  reaction?: number
  suggestion: Decision
  /** Ce que Martin a choisi : la suggestion n’est jamais appliquée d’office. */
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

/** users/{uid}/xpLog/{id} — journal d’XP, en ajout seul. Tout le reste (niveau, stats, radar) en découle. */
export interface XpEntry {
  date: ISODate
  kind: XpKind
  xp: number
  bossId?: string
  /** Séance d’un exercice qui nourrit plusieurs boss : l’XP compte pour chacun. */
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

/** Les anciens documents de `sessions` et `exposures` (avant la spec V2) n’ont pas ces champs : ils sont ignorés. */
export const isTrainingSession = (doc: Partial<TrainingSession>): doc is TrainingSession => Array.isArray(doc.trials) && typeof doc.bossId === 'string'
export const isExposure = (doc: Partial<Exposure>): doc is Exposure => typeof doc.reaction === 'number' && typeof doc.bossId === 'string'

export type WithId<T> = T & {
  id: string
  /** Écriture locale pas encore envoyée au serveur. */
  pending: boolean
}

/** users/{uid}/bones/{id} : les os, la monnaie de l’effort (gains et achats). */
export type { Bone } from '../lib/bones'

/** users/{uid}/inventory/{itemId} : un objet acheté dans la boutique. */
export interface InventoryItem {
  boughtAt: string
  price: number
}

/** Ce que le chien porte et les choix d’affichage achetés dans la boutique. Tous facultatifs. */
export interface Cosmetics {
  accessory?: string
  frame?: string
  background?: string
  sticker?: string
  theme?: string
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

/** users/{uid}/fog25/{zone de 0,05°} : les cases de 25 m découvertes (« i_j »), docs/specs/carte-a-decouvrir.md § 8. */
export interface FogZone {
  cells: string[]
}
