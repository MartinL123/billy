import { deleteDoc, deleteField, doc, onSnapshot, setDoc, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from './app'
import { selfUid, send, userDoc } from './paths'
import { sharesToDelete, tracksToClear, type LiveDoc, type LivePrivate, type LiveShareRef, type LiveStatus, type LiveTrack } from '../lib/liveShare'

// Partage en direct (T-087, spec V6 § 7) : live/{jeton}, hors de users/… pour être lu sans compte.
// firestore.rules : `get` pour tous (le jeton est la clé), jamais `list`, écriture par le seul propriétaire.
// Comme ailleurs, les écritures ne sont jamais attendues (hors ligne, elles partent au retour du réseau).

const liveDoc = (token: string) => doc(db, 'live', token)
/** users/{uid}/private/live : proches, prénom du maître, jetons des partages (jamais lu par un visiteur). */
const privateDoc = () => userDoc('private', 'live')

/** Modifie quelques champs de users/{uid}/private/live (créé au premier usage). */
export function updateLivePrivate(patch: LivePrivate): void {
  send(setDoc(privateDoc(), patch as DocumentData, { merge: true }))
}

/** users/{uid}/private/live en direct ; absent : rien encore (`{}`). Lecture tolérante : champs inconnus ignorés. */
export function watchLivePrivate(onData: (data: LivePrivate) => void): () => void {
  return onSnapshot(
    privateDoc(),
    (snap) => {
      const raw = (snap.exists() ? snap.data() : {}) as Record<string, unknown>
      onData({
        ...(Array.isArray(raw.proches) ? { proches: raw.proches as LivePrivate['proches'] } : {}),
        ...(typeof raw.ownerName === 'string' ? { ownerName: raw.ownerName } : {}),
        ...(Array.isArray(raw.liveShares) ? { liveShares: raw.liveShares as LiveShareRef[] } : {}),
      })
    },
    (error) => console.error('Lecture de private/live impossible', error),
  )
}

export interface LivePosition {
  lat?: number
  lng?: number
  distanceM: number
  /** T-123 : le tracé depuis le départ (simplifié, `liveTrack`). */
  track?: LiveTrack
}

/** « Partager » : crée live/{jeton} et retient le partage dans private/live (pour l’arrêter, puis l’effacer). */
export function startLiveShare(
  token: string,
  walk: { dogName: string; ownerName?: string; startedAt: string } & LivePosition,
  names: string[],
  shares: LiveShareRef[] | undefined,
): void {
  const now = new Date().toISOString()
  const live: LiveDoc = {
    ownerUid: selfUid(),
    dogName: walk.dogName,
    ...(walk.ownerName?.trim() ? { ownerName: walk.ownerName.trim() } : {}),
    startedAt: walk.startedAt,
    updatedAt: now,
    ...(walk.lat !== undefined && walk.lng !== undefined ? { lat: walk.lat, lng: walk.lng } : {}),
    distanceM: Math.round(walk.distanceM),
    status: 'en cours',
    ...(walk.track?.lat.length ? { track: walk.track } : {}),
  }
  send(setDoc(liveDoc(token), live))
  updateLivePrivate({ liveShares: [...(shares ?? []), { token, startedAt: now, with: names }] })
}

/** La position du moment et le tracé (toutes les 15 s pendant la balade, T-123). */
export function pushLivePosition(token: string, position: LivePosition, status: Exclude<LiveStatus, 'terminée'>): void {
  send(
    updateDoc(liveDoc(token), {
      updatedAt: new Date().toISOString(),
      ...(position.lat !== undefined && position.lng !== undefined ? { lat: position.lat, lng: position.lng } : {}),
      distanceM: Math.round(position.distanceM),
      ...(position.track?.lat.length ? { track: position.track } : {}),
      status,
    }),
  )
}

/**
 * « Arrêter », ou la balade est finie : « terminée », la position effacée tout de suite. T-123 : le tracé reste 1 h
 * (le proche voit où la balade est passée), puis `cleanLiveShares` l’efface.
 */
export function endLiveShare(token: string, shares: LiveShareRef[] | undefined, distanceM?: number, track?: LiveTrack): void {
  const now = new Date().toISOString()
  send(
    updateDoc(liveDoc(token), {
      status: 'terminée',
      lat: deleteField(),
      lng: deleteField(),
      endsAt: now,
      updatedAt: now,
      ...(distanceM !== undefined ? { distanceM: Math.round(distanceM) } : {}),
      ...(track?.lat.length ? { track } : {}),
    }),
  )
  updateLivePrivate({ liveShares: (shares ?? []).map((s) => (s.token === token && !s.endedAt ? { ...s, endedAt: now } : s)) })
}

/** À l’ouverture : les partages arrêtés depuis 24 h sont effacés (par leur jeton : `list` est interdit). */
export function cleanLiveShares(shares: LiveShareRef[] | undefined, now: number): void {
  const old = sharesToDelete(shares, now)
  // T-123 : le tracé d’un partage fini depuis 1 h est effacé (le reste du document attend les 24 h).
  const clear = tracksToClear(shares, now)
  if (!old.length && !clear.length) return
  for (const share of old) send(deleteDoc(liveDoc(share.token)))
  for (const share of clear) send(updateDoc(liveDoc(share.token), { track: deleteField() }))
  updateLivePrivate({ liveShares: (shares ?? []).filter((s) => !old.includes(s)).map((s) => (clear.includes(s) ? { ...s, trackCleared: true } : s)) })
}

/**
 * La page « Suivre » : le document du jeton, en direct. `null` : introuvable ou illisible ; `fromCache` : réponse du
 * cache local seulement (le serveur n’a pas encore répondu).
 */
export function watchLive(token: string, onData: (live: LiveDoc | null, fromCache: boolean) => void): () => void {
  return onSnapshot(
    liveDoc(token),
    { includeMetadataChanges: true },
    (snap) => onData(snap.exists() ? (snap.data() as LiveDoc) : null, snap.metadata.fromCache),
    () => onData(null, false),
  )
}
