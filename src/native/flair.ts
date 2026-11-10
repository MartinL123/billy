import { isNative } from '../native'
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type { GpsPoint } from '../lib/gpsWalk'
import type { WalkMarker } from '../lib/route'
import type { WatchWalk } from '../lib/watch'
import type { HealthExtras } from '../lib/walkHealth'
import { withTimeout } from '../lib/timeout'
import type { AutoTrack, Home } from '../lib/autoWalk'

/** T-122 : le réglage tel que l’iPhone le garde. */
export interface AutoWalkConfig {
  enabled: boolean
  homes: Home[]
  status: 'always' | 'whenInUse' | 'denied' | 'notDetermined'
  recording: boolean
}

export type PhotosStatus = 'granted' | 'limited' | 'denied' | 'prompt'

/** T-103 : une photo de la photothèque prise pendant la balade. */
export interface LibraryPhoto {
  /** JPEG en base64. */
  data: string
  time?: string
  lat?: number
  lng?: number
}

// Le plugin local de l'app iOS (`ios/App/App/FlairNativePlugin.swift`). À n'appeler que derrière `isNative()` :
// sur le web, il n'existe pas.

export interface WatchWalks {
  /** Faux sur un appareil sans Santé (iPad). */
  available: boolean
  /** Les marches et randonnées avec un tracé, de la plus ancienne à la plus récente. */
  walks: WatchWalk[]
  /** Les marches sans tracé (en intérieur, GPS coupé) : comptées, pas importées. */
  withoutRoute: number
  /** Toutes les séances lues (tous sports) : 0 peut vouloir dire que la lecture n'est pas autorisée. */
  workouts: number
}

/** La balade enregistrée par l'iPhone (T-036). */
export interface CurrentWalk {
  /** Une balade est commencée (même si l'app a été fermée depuis). */
  active: boolean
  /** Le GPS enregistre en ce moment. Faux si l'app a été tuée ou après l'arrêt automatique de 3 h. */
  recording: boolean
  startedAt?: string
  autoStopped?: boolean
  /** « Terminer » a été touché : le GPS est arrêté, la balade attend d’être enregistrée (R-042). */
  stopped?: boolean
  stoppedAt?: string
  points: GpsPoint[]
  /** T-060 : « Position exacte » coupée : les positions sont trop imprécises pour un tracé. */
  reducedAccuracy?: boolean
  /** T-061 : déjà enregistrée dans la base locale (cette entrée), en attente d’envoi au serveur : rien à faire. */
  savedAs?: string
  /** T-086 : les « Repère » touchés sur la Live Activity (écran verrouillé, Dynamic Island), gardés avec la balade. */
  markers?: WalkMarker[]
  /** T-101 : l’exercice au parc a déjà été proposé pendant cette balade (bandeau ou notification). */
  parkOffered?: boolean
}

interface FlairNativePlugin {
  /** T-121 : la distance à pied (iPhone et Watch, fusionnés par Santé) par tranches de 5 min depuis `since`, tranches vides omises. */
  getWalkingBouts(options: { since: string }): Promise<{ available: boolean; buckets: { start: string; meters: number }[] }>
  /** R-104 : `until` (facultatif) borne la lecture, pour un rattrapage par tranches de 7 jours. */
  getWalks(options: { since: string; until?: string }): Promise<WatchWalks>
  /** T-080 : le cœur, les pas et l’énergie que Santé a sur cette fenêtre (vide si rien, ou si la lecture n’est pas permise). */
  healthWindow(options: { start: string; end: string }): Promise<HealthExtras>
  /**
   * Démarre, ou reprend la balade en cours. Rejet `denied` si la position n'est pas autorisée. `dogName` : le nom
   * affiché par la Live Activity (T-086, « Balade avec Billy ») ; une app iOS plus ancienne l’ignore.
   */
  startWalk(options?: { dogName?: string }): Promise<CurrentWalk>
  /** Arrête le GPS et renvoie la balade. Le fichier est gardé jusqu'à `clearWalk()` (R-042). */
  stopWalk(): Promise<CurrentWalk>
  /** Efface la balade : seulement après un enregistrement réussi. */
  clearWalk(): Promise<void>
  cancelWalk(): Promise<void>
  currentWalk(): Promise<CurrentWalk>
  keepAwake(options: { on: boolean }): Promise<void>
  /** R-078 : retour par glissement depuis le bord gauche (coupé pendant une balade en cours). */
  setBackGesture(options: { on: boolean }): Promise<void>
  /** R-080 : une petite vibration (succès) ou un léger « clic » (sélection). */
  haptic(options: { type: 'success' | 'selection' }): Promise<void>
  /** T-061 : la balade est dans la base locale, pas encore au serveur ; sa copie est gardée. */
  markSaved(options: { entryId: string }): Promise<void>
  /** T-061 : les entrées dont la copie attend que l’envoi soit confirmé. */
  pendingSent(): Promise<{ ids: string[] }>
  clearSent(options: { ids: string[] }): Promise<void>
  /**
   * T-084 : ce que l’iPhone doit savoir pour annoncer seul une balade de la Watch (réveillé par Santé, sans le JS) :
   * la lecture des marches est choisie (R-079), la notification est voulue (Profil › Notifications), le prénom du chien.
   */
  setWatchNotify(options: { optedIn: boolean; enabled: boolean; dogName: string }): Promise<void>
  /** T-086 : les bouts de territoire de la Live Activity. Plus appelé depuis la V6.1 (§ 1) : la Live Activity n’en montre pas (0). */
  setLiveWalk(options: { bits: number }): Promise<void>
  /** T-101 : les parcs de la balade (rectangle et texte de la notification) ; liste vide : rien à proposer. */
  setParks(options: { parks: { s: number; w: number; n: number; e: number; text: string }[]; title: string }): Promise<void>
  /** T-124 : les proches dont l’adresse est connue, pour « Vous passez près de chez… » pendant cette balade. */
  setNearProches(options: { proches: { id: string; name: string; lat: number; lng: number }[] }): Promise<void>
  /** T-101 : le bandeau a été montré : plus de notification pendant cette balade. */
  parkOffered(): Promise<void>
  /** T-103 : l’accès à la photothèque ; avec `ask`, iOS le demande la première fois. */
  photosAccess(options: { ask: boolean }): Promise<{ status: PhotosStatus }>
  /** T-103 : les photos prises entre `start` et `end` (JPEG en base64, 1600 px au plus), sans les vidéos. */
  walkPhotos(options: { start: string; end: string; max?: number }): Promise<{ photos: LibraryPhoto[] }>
  /** T-122 : la balade enregistrée seule en sortant de chez soi : le réglage, les points de départ, la position « Toujours ». */
  autoWalkConfig(): Promise<AutoWalkConfig>
  /** Allumé : demande la position « Toujours » (une fois) et surveille 150 m autour de chaque point de départ. */
  setAutoWalk(options: { enabled: boolean; homes: Home[] }): Promise<AutoWalkConfig>
  /** Les tracés gardés en attente de réponse. */
  autoWalks(): Promise<{ tracks: AutoTrack[]; recording: boolean }>
  clearAutoWalk(options: { id: string }): Promise<void>
  /** R-116 : la notification au retour dans la zone (« Balade enregistrée : 32 min, 1,9 km. C’était avec Billy ? »). */
  setAutoWalkNotify(options: { enabled: boolean; dogName: string }): Promise<void>
  addListener(event: 'walkPoint', listener: (point: GpsPoint) => void): Promise<PluginListenerHandle>
  /** T-124 : à 500 m de chez un proche, app au premier plan (sinon, la notification). */
  addListener(event: 'procheNear', listener: (data: { id: string }) => void): Promise<PluginListenerHandle>
  addListener(event: 'walkStopped', listener: (data: { stoppedAt?: string }) => void): Promise<PluginListenerHandle>
  /** La précision du GPS à chaque mise à jour (même pour un point écarté) : signal faible (T-051). */
  /** T-062 : un point n’a pas pu être écrit sur l’iPhone (`storage` : stockage plein). */
  addListener(event: 'walkError', listener: (data: { code: string }) => void): Promise<PluginListenerHandle>
  /** T-084 : une marche de la Watch vient d’arriver dans Santé, app ouverte. */
  addListener(event: 'watchArrived', listener: () => void): Promise<PluginListenerHandle>
  /** T-086 : « Repère » touché sur la Live Activity : la position est gardée avec la balade. */
  addListener(event: 'walkMarker', listener: (marker: WalkMarker) => void): Promise<PluginListenerHandle>
  addListener(event: 'walkSignal', listener: (data: { accuracy: number; time: string }) => void): Promise<PluginListenerHandle>
}

export const FlairNative = registerPlugin<FlairNativePlugin>('FlairNative')

/** R-080 : retour haptique, app iOS seulement ; jamais bloquant. */
export function haptic(type: 'success' | 'selection'): void {
  if (!isNative()) return
  FlairNative.haptic({ type }).catch(() => undefined)
}

/**
 * T-080 : ce que Santé sait de la fenêtre d’une balade du GPS de Flair (Watch au poignet). Jamais bloquant : rien si
 * Santé ne répond pas en 8 s, si la lecture n’est pas permise ou si l’app iOS est plus ancienne (méthode absente).
 */
export async function readHealthWindow(start: string, end: string): Promise<HealthExtras> {
  if (!isNative()) return {}
  try {
    return (await withTimeout(FlairNative.healthWindow({ start, end }), 8_000, 'healthWindow')) ?? {}
  } catch {
    return {}
  }
}

/** T-084 : confie à l’iPhone les choix utiles au réveil par Santé. Jamais bloquant (app iOS plus ancienne : rien). */
export function setWatchNotify(options: { optedIn: boolean; enabled: boolean; dogName: string }): void {
  if (!isNative()) return
  FlairNative.setWatchNotify(options).catch(() => undefined)
}

/** T-103 : l’accès à la photothèque (`unavailable` sur le web ou une app iOS plus ancienne). */
export async function photosAccess(ask: boolean): Promise<PhotosStatus | 'unavailable'> {
  if (!isNative()) return 'unavailable'
  try {
    // La première fois, la fenêtre d’iOS attend la réponse de la personne.
    return (await withTimeout(FlairNative.photosAccess({ ask }), ask ? 120_000 : 5_000, 'photosAccess')).status
  } catch {
    return 'unavailable'
  }
}

/** T-103 : les photos prises pendant la balade ; rien si l’accès manque, si l’iPhone ne répond pas ou sur le web. */
export async function readWalkPhotos(start: string, end: string): Promise<LibraryPhoto[]> {
  if (!isNative()) return []
  try {
    const answer = await withTimeout(FlairNative.walkPhotos({ start, end }), 60_000, 'walkPhotos')
    return Array.isArray(answer.photos) ? answer.photos : []
  } catch {
    return []
  }
}
