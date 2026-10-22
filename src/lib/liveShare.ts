import { formatRouteDistance } from './route'

// Partage en direct (T-087, spec V6 § 7) : un lien secret vers live/{jeton}, ouvert sans compte. Le jeton fait office
// de clé : 128 bits aléatoires, jamais listés. Flair n’envoie rien lui-même : la feuille de partage d’iOS s’en charge.

export type LiveStatus = 'en cours' | 'pause' | 'terminée'

/** live/{jeton} : ce que voit la page « Suivre ». Aucune autre donnée (ni tracé, ni proches). */
export interface LiveDoc {
  ownerUid: string
  dogName: string
  /** Le prénom du maître (Profil › Mes proches), s’il est donné : « Billy et Martin sont en balade ». */
  ownerName?: string
  startedAt: string
  updatedAt: string
  /** Absentes à la fin (position effacée) ou tant que le GPS n’a rien donné. */
  lat?: number
  lng?: number
  distanceM: number
  status: LiveStatus
  endsAt?: string
}

/** Un proche (Profil › Mes proches) : prénom et numéro ou e-mail. */
export interface Proche {
  id: string
  name: string
  contact?: string
}

/** Un partage lancé depuis ce compte, gardé dans le profil pour l’arrêter et l’effacer après 24 h (sans `list`). */
export interface LiveShareRef {
  token: string
  startedAt: string
  /** Prénoms des proches choisis : « Partagé en direct avec Coralie ». */
  with: string[]
  endedAt?: string
}

/**
 * users/{uid}/private/live : les proches (numéros et e-mails de tiers), le prénom du maître et les jetons des partages.
 * Lu par le seul propriétaire, jamais par un visiteur (T-048) : ces jetons donnent la position en direct.
 */
export interface LivePrivate {
  proches?: Proche[]
  ownerName?: string
  liveShares?: LiveShareRef[]
}

/** Mise à jour de la position : toutes les 60 s (≈ 60 écritures par heure). */
export const PUSH_MS = 60_000
/** Un partage terminé (ou oublié) disparaît 24 h après. */
export const KEEP_MS = 24 * 3600_000
/** On choisit une ou deux personnes. */
export const MAX_CHOSEN = 2

/** 128 bits aléatoires, en base64url (22 caractères). */
export function newToken(random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(16))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Un jeton plausible : 22 caractères base64url. Le reste ne part pas à Firestore. */
export const isToken = (token: string) => /^[A-Za-z0-9_-]{22}$/.test(token)

/** Le site publié, si l’app tourne depuis le paquet embarqué (capacitor://) : le lien doit s’ouvrir dans Safari. */
const SITE = 'https://martinl123.github.io/billy/'

/** Le lien à envoyer : l’adresse du site (émulateurs et dev compris) + #/suivre/<jeton>. */
export function followLink(token: string, location: { origin: string; pathname: string; protocol?: string }): string {
  const web = /^https?:$/.test(location.protocol ?? new URL(location.origin).protocol)
  return `${web ? `${location.origin}${location.pathname}` : SITE}#/suivre/${token}`
}

/** Ce qui suit « #/suivre/ » (vérifié ensuite par `isToken` : un lien coupé donne un message calme), sinon undefined. */
export function followTokenFromHash(hash: string): string | undefined {
  const match = /^#\/suivre\/([^/?#]*)/.exec(hash)
  return match ? match[1] : undefined
}

/** « 23 min », « 1 h 05 » (espaces insécables). */
export function formatSince(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

/** « 8 h 44 », à l’heure de l’appareil de celui qui regarde. */
export function clockTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`
}

/** « Billy et Martin sont en balade depuis 23 min · 1,4 km ». */
export function followSentence(live: Pick<LiveDoc, 'dogName' | 'ownerName' | 'startedAt' | 'distanceM' | 'status' | 'endsAt'>, now: number): string {
  const distance = formatRouteDistance(live.distanceM)
  if (live.status === 'terminée') return `Balade terminée${live.endsAt ? ` à ${clockTime(live.endsAt)}` : ''}`
  const since = formatSince(now - Date.parse(live.startedAt))
  const owner = live.ownerName?.trim()
  if (live.status === 'pause') return `Balade en pause · ${since} · ${distance}`
  return owner ? `${live.dogName} et ${owner} sont en balade depuis ${since} · ${distance}` : `${live.dogName} est en balade depuis ${since} · ${distance}`
}

/** « Mis à jour il y a 40 s », « … il y a 3 min », puis « Mis à jour à 8 h 12 ». */
export function updatedSentence(updatedAt: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(updatedAt)) / 1000))
  if (s < 5) return 'Mis à jour à l’instant'
  if (s < 60) return `Mis à jour il y a ${s} s`
  if (s < 3600) return `Mis à jour il y a ${Math.floor(s / 60)} min`
  return `Mis à jour à ${clockTime(updatedAt)}`
}

/** Plus rien à montrer : terminé (ou plus mis à jour) depuis 24 h. */
export function liveExpired(live: Pick<LiveDoc, 'updatedAt' | 'endsAt'>, now: number): boolean {
  return now - Date.parse(live.endsAt ?? live.updatedAt) >= KEEP_MS
}

/** Le partage en cours (le dernier non arrêté), s’il y en a un. */
export function activeShare(shares: LiveShareRef[] | undefined, now: number): LiveShareRef | undefined {
  return [...(shares ?? [])].reverse().find((s) => !s.endedAt && now - Date.parse(s.startedAt) < KEEP_MS)
}

/** Les partages à effacer à l’ouverture : arrêtés (ou commencés, s’ils n’ont jamais été arrêtés) depuis 24 h. */
export function sharesToDelete(shares: LiveShareRef[] | undefined, now: number): LiveShareRef[] {
  return (shares ?? []).filter((s) => now - Date.parse(s.endedAt ?? s.startedAt) >= KEEP_MS)
}

/** Une mise à jour est due : jamais plus d’une par minute. */
export const pushDue = (lastPush: number | undefined, now: number) => lastPush === undefined || now - lastPush >= PUSH_MS

/** « Coralie », « Coralie et Paul ». */
export const withNames = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}` : (names[0] ?? 'un proche'))

/** Le statut à publier selon la balade de l’iPhone : en cours, en pause (GPS arrêté), ou finie. */
export function walkLiveStatus(walk: { active: boolean; recording: boolean; stopped?: boolean; savedAs?: string }): LiveStatus {
  if (!walk.active || walk.savedAs || walk.stopped) return 'terminée'
  return walk.recording ? 'en cours' : 'pause'
}

/** Un proche valable : un prénom ; numéro ou e-mail facultatif. */
export function cleanProche(input: { name: string; contact: string }, id: string): Proche | undefined {
  const name = input.name.trim().slice(0, 40)
  if (!name) return undefined
  const contact = input.contact.trim().slice(0, 80)
  return { id, name, ...(contact ? { contact } : {}) }
}
