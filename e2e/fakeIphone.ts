import type { BrowserContext, Page } from '@playwright/test'

/**
 * Faux iPhone pour les tests (T-063) : la page croit tourner dans l'app iOS (Capacitor, plateforme « ios ») et les
 * appels au plugin `FlairNative` arrivent ici, côté Node. L'état de la balade vit dans cet objet, comme le fichier
 * `balade-en-cours/` de `FlairNativePlugin.swift` : il survit au rechargement et à la fermeture de la page.
 * Seul `recording` (en mémoire dans l'app native) est perdu quand la page est « tuée ».
 */

export interface GpsPoint {
  lat: number
  lng: number
  time: string
}

interface Walk {
  startedAt: string
  stoppedAt?: string
  savedAs?: string
  points: GpsPoint[]
  /** T-086 : les « Repère » touchés sur la Live Activity (`reperes.txt`). */
  markers?: GpsPoint[]
}

type Reply = { ok: true; data?: unknown } | { ok: false; error: { message: string; code?: string } }

const FLAIR_METHODS = ['getWalks', 'healthWindow', 'startWalk', 'stopWalk', 'clearWalk', 'cancelWalk', 'currentWalk', 'keepAwake', 'markSaved', 'pendingSent', 'clearSent', 'setBackGesture', 'haptic', 'setWatchNotify', 'motionStatus', 'motionWalks', 'setLiveWalk', 'photosAccess', 'walkPhotos', 'setParks', 'parkOffered']
const NOTIFICATION_METHODS = ['checkPermissions', 'requestPermissions', 'getPending', 'cancel', 'schedule', 'getDeliveredNotifications', 'removeAllDeliveredNotifications', 'createChannel', 'listChannels', 'areEnabled']

/**
 * Le pont, posé avant le code de la page. `window.webkit.messageHandlers.bridge` fait de la page l'app iOS ;
 * `PluginHeaders` déclare les plugins natifs, et Capacitor passe alors par `nativePromise` / `nativeCallback`
 * (les mêmes fonctions que `native-bridge.js` de @capacitor/ios), qu'on remplace par l'appel à Node.
 */
const BRIDGE = `(() => {
  const listeners = new Map()
  let next = 1
  const header = (name, methods) => ({
    name,
    methods: [
      ...methods.map((m) => ({ name: m, rtype: 'promise' })),
      { name: 'addListener', rtype: 'callback' },
      { name: 'removeListener', rtype: 'promise' },
      { name: 'removeAllListeners', rtype: 'promise' },
    ],
  })
  // Capacitor reconnaît l'app iOS à la présence de ce pont (window.webkit.messageHandlers.bridge).
  if (!window.webkit) window.webkit = {}
  if (!window.webkit.messageHandlers) window.webkit.messageHandlers = {}
  if (!window.webkit.messageHandlers.bridge) window.webkit.messageHandlers.bridge = { postMessage() {} }
  window.Capacitor = {
    PluginHeaders: [header('FlairNative', ${JSON.stringify(FLAIR_METHODS)}), header('LocalNotifications', ${JSON.stringify(NOTIFICATION_METHODS)})],
    nativeCallback(plugin, method, options, callback) {
      const id = String(next++)
      if (method === 'addListener') listeners.set(id, { plugin, event: options && options.eventName, callback })
      return id
    },
    nativePromise(plugin, method, options) {
      if (method === 'removeListener') {
        listeners.delete(options && options.callbackId)
        return Promise.resolve()
      }
      if (method === 'removeAllListeners') {
        for (const [id, l] of listeners) if (l.plugin === plugin) listeners.delete(id)
        return Promise.resolve()
      }
      return window.__fakeIphone(plugin, method, options || {}).then((reply) => {
        if (reply.ok) return reply.data
        const error = new Error(reply.error.message)
        error.code = reply.error.code
        throw error
      })
    },
  }
  window.__fakeIphoneEmit = (plugin, event, data) => {
    for (const l of listeners.values()) if (l.plugin === plugin && l.event === event) l.callback(data)
  }
})()`

export class FakeIphone {
  walk?: Walk
  /** Le GPS enregistre (en mémoire dans l'app native : faux après une fermeture). */
  recording = false
  /** Les copies gardées jusqu'à l'envoi au serveur (`balades-a-envoyer/`). */
  sent: string[] = []
  /** Position refusée dans Réglages (« Jamais »). */
  denied = false
  /** L'heure de départ d'une nouvelle balade, en minutes avant maintenant (une balade de test dure plus de 2 min). */
  startMinutesAgo = 20
  /** T-085 : Mouvements et forme (absent : iPhone sans capteur). */
  motion?: { status: 'granted' | 'denied' | 'prompt'; periods: { start: string; end: string }[] }
  /** T-103 : les photos de la photothèque (absent : accès pas encore demandé). */
  photos?: { data: string; time?: string; lat?: number; lng?: number }[]
  /** T-101 : un parc (inventé) autour du départ dans la réponse d’Overpass ; absent : aucun parc. */
  parkName?: string
  /** T-101 : les parcs confiés à l’iPhone pour l’écran verrouillé, et si l’exercice a été proposé. */
  parks: unknown[] = []
  parkOffered = false
  /** Chaque appel reçu, pour vérifier par exemple qu'aucune balade ne redémarre. */
  calls: { method: string; options: unknown }[] = []

  async install(context: BrowserContext) {
    await context.exposeBinding('__fakeIphone', (_source, plugin: string, method: string, options: Record<string, unknown>) => this.handle(plugin, method, options))
    await context.addInitScript(BRIDGE)
    // T-101 : jamais d’appel au vrai Overpass pendant les tests ; un parc de 2 km de côté autour du départ si demandé.
    await context.route('https://overpass-api.de/**', (route) => {
      const around = /around:\d+,([-\d.]+),([-\d.]+)/.exec(decodeURIComponent(route.request().url()))
      const [lat, lng] = around ? [Number(around[1]), Number(around[2])] : [0, 0]
      const elements = this.parkName ? [{ type: 'way', id: 1, tags: { leisure: 'park', name: this.parkName }, bounds: { minlat: lat - 0.01, minlon: lng - 0.01, maxlat: lat + 0.01, maxlon: lng + 0.01 } }] : []
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ elements }) })
    })
  }

  count(method: string) {
    return this.calls.filter((c) => c.method === method).length
  }

  /** L'app est tuée (balayage) : la page se ferme, le GPS s'arrête, le fichier reste. */
  async kill(page: Page) {
    await page.close()
    this.recording = false
  }

  /** Des points GPS, 20 m plus au nord à chaque fois, toutes les 15 s depuis le départ ; envoyés à l'écran en direct. */
  async walkPoints(page: Page, n: number) {
    if (!this.walk || !this.recording) throw new Error('Pas de balade en cours sur le faux iPhone')
    for (let i = 0; i < n; i++) {
      const points = this.walk.points
      const last = points[points.length - 1]
      const point: GpsPoint = {
        lat: last ? last.lat + 0.00018 : 48.8566 + Math.random() * 0.01,
        lng: last ? last.lng : 2.3522 + Math.random() * 0.01,
        time: new Date(Date.parse(this.walk.startedAt) + points.length * 15_000).toISOString(),
      }
      points.push(point)
      await page.evaluate(([p]) => (window as unknown as { __fakeIphoneEmit: (a: string, b: string, c: unknown) => void }).__fakeIphoneEmit('FlairNative', 'walkPoint', p), [point] as const)
    }
  }

  /** T-086 : « Repère » touché sur la Live Activity : la dernière position est gardée, l'écran en est prévenu. */
  async placeMarker(page: Page) {
    const last = this.walk?.points[this.walk.points.length - 1]
    if (!this.walk || !this.recording || !last) throw new Error('Pas de position pour un repère')
    const marker: GpsPoint = { lat: last.lat, lng: last.lng, time: last.time }
    this.walk.markers = [...(this.walk.markers ?? []), marker]
    await page.evaluate(([m]) => (window as unknown as { __fakeIphoneEmit: (a: string, b: string, c: unknown) => void }).__fakeIphoneEmit('FlairNative', 'walkMarker', m), [marker] as const)
  }

  private summary() {
    const walk = this.walk
    if (!walk) return { active: false, recording: false, points: [] }
    return {
      active: true,
      recording: this.recording,
      startedAt: walk.startedAt,
      autoStopped: false,
      stopped: walk.stoppedAt !== undefined,
      points: [...walk.points],
      ...(walk.stoppedAt ? { stoppedAt: walk.stoppedAt } : {}),
      ...(walk.savedAs ? { savedAs: walk.savedAs } : {}),
      ...(walk.markers?.length ? { markers: [...walk.markers] } : {}),
      ...(this.parkOffered ? { parkOffered: true } : {}),
    }
  }

  private handle(plugin: string, method: string, options: Record<string, unknown>): Reply {
    this.calls.push({ method: `${plugin}.${method}`, options })
    if (plugin === 'LocalNotifications') {
      if (method === 'checkPermissions' || method === 'requestPermissions') return { ok: true, data: { display: 'denied' } }
      if (method === 'getPending') return { ok: true, data: { notifications: [] } }
      return { ok: true }
    }
    if (plugin !== 'FlairNative') return { ok: false, error: { message: `${plugin} absent du faux iPhone`, code: 'UNIMPLEMENTED' } }
    switch (method) {
      case 'getWalks':
        return { ok: true, data: { available: false, walks: [], withoutRoute: 0, workouts: 0 } }
      case 'healthWindow':
        return { ok: true, data: {} }
      case 'currentWalk':
        return { ok: true, data: this.summary() }
      case 'startWalk': {
        if (this.denied) return { ok: false, error: { message: "La position n'est pas autorisée", code: 'denied' } }
        // T-061 : la balade d'avant attend le réseau : sa copie part dans « à envoyer », on repart à zéro.
        if (this.walk?.savedAs) {
          this.sent.push(this.walk.savedAs)
          this.walk = undefined
        }
        if (this.walk?.stoppedAt) return { ok: true, data: this.summary() }
        if (!this.walk) this.parkOffered = false
        if (!this.walk) this.walk = { startedAt: new Date(Date.now() - this.startMinutesAgo * 60_000).toISOString(), points: [] }
        this.recording = true
        return { ok: true, data: this.summary() }
      }
      case 'stopWalk':
        this.recording = false
        if (this.walk && !this.walk.stoppedAt) this.walk.stoppedAt = new Date().toISOString()
        return { ok: true, data: this.summary() }
      case 'clearWalk':
        this.walk = undefined
        return { ok: true }
      case 'cancelWalk':
        this.recording = false
        this.walk = undefined
        return { ok: true }
      case 'markSaved':
        if (this.walk && typeof options.entryId === 'string' && options.entryId) this.walk.savedAs = options.entryId
        return { ok: true }
      case 'pendingSent':
        return { ok: true, data: { ids: [...this.sent, ...(this.walk?.savedAs ? [this.walk.savedAs] : [])] } }
      case 'clearSent': {
        const ids = Array.isArray(options.ids) ? (options.ids as string[]) : []
        this.sent = this.sent.filter((id) => !ids.includes(id))
        if (this.walk?.savedAs && ids.includes(this.walk.savedAs)) this.walk = undefined
        return { ok: true }
      }
      case 'keepAwake':
      case 'setBackGesture':
      case 'haptic':
      case 'setWatchNotify':
      // T-086 : la Live Activity n’est pas dessinée ici ; ses repères passent par `placeMarker`.
      case 'setLiveWalk':
        return { ok: true }
      // T-085 : par défaut, pas de capteur de mouvement (aucune carte « C’était une sortie ? »).
      case 'motionStatus':
        return { ok: true, data: this.motion ? { available: true, status: this.motion.status } : { available: false, status: 'denied' } }
      case 'motionWalks':
        return { ok: true, data: { periods: this.motion?.status === 'granted' ? this.motion.periods : [] } }
      // T-101 : l’écran verrouillé n’est pas simulé ; on garde seulement ce que l’iPhone a reçu.
      case 'setParks':
        this.parks = Array.isArray(options.parks) ? options.parks : []
        return { ok: true }
      case 'parkOffered':
        this.parkOffered = true
        return { ok: true }
      // T-103 : la photothèque, jamais demandée par défaut (aucune photo).
      case 'photosAccess':
        return { ok: true, data: { status: this.photos ? 'granted' : 'prompt' } }
      case 'walkPhotos':
        return { ok: true, data: { photos: this.photos ?? [] } }
      default:
        return { ok: false, error: { message: `FlairNative.${method} inconnu`, code: 'UNIMPLEMENTED' } }
    }
  }
}
