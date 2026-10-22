import { deleteDoc, deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './app'
import { selfUid, send } from './paths'
import { updateDog } from './db'
import { sharesToDelete, type LiveDoc, type LiveShareRef, type LiveStatus } from '../lib/liveShare'

// Partage en direct (T-087, spec V6 § 7) : live/{jeton}, hors de users/… pour être lu sans compte.
// firestore.rules : `get` pour tous (le jeton est la clé), jamais `list`, écriture par le seul propriétaire.
// Comme ailleurs, les écritures ne sont jamais attendues (hors ligne, elles partent au retour du réseau).

const liveDoc = (token: string) => doc(db, 'live', token)

export interface LivePosition {
  lat?: number
  lng?: number
  distanceM: number
}

/** « Partager » : crée live/{jeton} et retient le partage dans le profil (pour l’arrêter, puis l’effacer). */
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
  }
  send(setDoc(liveDoc(token), live))
  updateDog({ liveShares: [...(shares ?? []), { token, startedAt: now, with: names }] })
}

/** La position du moment (toutes les 60 s pendant la balade). */
export function pushLivePosition(token: string, position: LivePosition, status: Exclude<LiveStatus, 'terminée'>): void {
  send(
    updateDoc(liveDoc(token), {
      updatedAt: new Date().toISOString(),
      ...(position.lat !== undefined && position.lng !== undefined ? { lat: position.lat, lng: position.lng } : {}),
      distanceM: Math.round(position.distanceM),
      status,
    }),
  )
}

/** « Arrêter », ou la balade est finie : « terminée », la position effacée tout de suite. */
export function endLiveShare(token: string, shares: LiveShareRef[] | undefined, distanceM?: number): void {
  const now = new Date().toISOString()
  send(
    updateDoc(liveDoc(token), {
      status: 'terminée',
      lat: deleteField(),
      lng: deleteField(),
      endsAt: now,
      updatedAt: now,
      ...(distanceM !== undefined ? { distanceM: Math.round(distanceM) } : {}),
    }),
  )
  updateDog({ liveShares: (shares ?? []).map((s) => (s.token === token && !s.endedAt ? { ...s, endedAt: now } : s)) })
}

/** À l’ouverture : les partages arrêtés depuis 24 h sont effacés (par leur jeton : `list` est interdit). */
export function cleanLiveShares(shares: LiveShareRef[] | undefined, now: number): void {
  const old = sharesToDelete(shares, now)
  if (!old.length) return
  for (const share of old) send(deleteDoc(liveDoc(share.token)))
  updateDog({ liveShares: (shares ?? []).filter((s) => !old.includes(s)) })
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
