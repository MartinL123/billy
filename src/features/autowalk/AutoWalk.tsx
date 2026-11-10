import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { BonesGained } from '../../components/BoneIcon'
import { SWITCH } from '../../components/Form'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { APP_NAME } from '../../appName'
import { updateDog } from '../../firebase/db'
import { saveDetected } from '../../firebase/imports'
import { useData } from '../../firebase/store'
import { knownImportKeys } from '../../lib/activity'
import { autoWalkLines, cardLater, homeSuggestions, overlapsTrack, showAutoWalkCard, sortAutoTracks, type AutoTrack, type Home } from '../../lib/autoWalk'
import { todayISO } from '../../lib/dates'
import { dogName, realDogName } from '../../lib/dogName'
import { autoWalkNoticeOn } from '../../lib/localNotifications'
import { LOCATE_OPTIONS } from '../../lib/locate'
import { useToday } from '../../lib/useToday'
import { walkItems } from '../../lib/walkList'
import { walkTimes } from '../../lib/walks'
import { withTimeout } from '../../lib/timeout'
import { isNative } from '../../native'
import { FlairNative, haptic, type AutoWalkConfig } from '../../native/flair'
import { importActivities } from '../balades/importRun'
import { RouteMap } from '../balades/JournalWalkCard'
import { gpsActivity } from '../../lib/gpsWalk'
import { askNotificationPermission } from '../notifications/localNotifications'
import { AUTO_WALK_OPEN } from './autoWalkEvents'

// T-122 (app iOS) : la balade enregistrée seule en sortant de chez soi. Le natif (`AutoWalks`, FlairNativePlugin.swift)
// enregistre ; ici, à l’ouverture, la feuille « Balade enregistrée » la fait confirmer en un toucher, et le réglage de
// Son profil › Réglages › Balades détectées l’allume. Rien sur le web.

// Les tracés à proposer, partagés avec le bandeau des sorties repérées (T-121) : il ne propose pas le même moment.
let tracks: AutoTrack[] = []
const listeners = new Set<() => void>()
const setTracks = (next: AutoTrack[]) => {
  tracks = next
  for (const l of listeners) l()
}
export const useAutoTracks = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    () => tracks,
  )

/** « Plus tard » : plus proposée jusqu’à la prochaine ouverture de l’app. */
const later = new Set<string>()

/** Accueil, app iOS : à l’ouverture et au retour au premier plan, la balade enregistrée seule à confirmer. */
export function AutoWalkPrompt() {
  const { entries, dog } = useData()
  const pending = useAutoTracks()
  const [, setTick] = useState(0)
  // Relu à l’ouverture et au retour au premier plan seulement, pas à chaque changement des balades.
  const latest = useRef(entries)
  latest.current = entries

  const read = useCallback(async () => {
    if (!isNative() || document.visibilityState !== 'visible') return
    try {
      const { tracks: all } = await withTimeout(FlairNative.autoWalks(), 10_000, 'autoWalks')
      const { keep, drop } = sortAutoTracks(all, { walks: latest.current, now: Date.now() })
      // Trop courte, en voiture, déjà couverte ou sans réponse depuis 14 jours : effacée de l’iPhone.
      for (const t of drop) void FlairNative.clearAutoWalk({ id: t.id })
      setTracks(keep)
    } catch (error) {
      // Une app iOS plus ancienne (sans autoWalks) : rien à proposer.
      console.error('Balades enregistrées seules illisibles', error)
    }
  }, [])

  useEffect(() => {
    void read()
    const onVisible = () => void read()
    // R-116 : la notification « Balade enregistrée » touchée : sa feuille, même après « Plus tard ».
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string | undefined>).detail
      if (id) later.delete(id)
      else later.clear()
      setTick((n) => n + 1)
      void read()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(AUTO_WALK_OPEN, onOpen)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(AUTO_WALK_OPEN, onOpen)
    }
  }, [read])

  // R-116 : l’iPhone prévient seul au retour (« Quand une balade s’enregistre seule », Profil › Notifications).
  const notice = autoWalkNoticeOn(dog.notifications)
  const noticeName = realDogName(dog)
  useEffect(() => {
    if (isNative()) FlairNative.setAutoWalkNotify({ enabled: notice, dogName: noticeName }).catch(() => undefined)
  }, [notice, noticeName])

  const track = pending.find((t) => !later.has(t.id))
  if (!track) return null
  return (
    <AutoWalkSheet
      key={track.id}
      track={track}
      onDone={() => setTracks(tracks.filter((t) => t.id !== track.id))}
      onLater={() => {
        for (const t of tracks) later.add(t.id)
        setTick((n) => n + 1)
      }}
    />
  )
}

function AutoWalkSheet({ track, onDone, onLater }: { track: AutoTrack; onDone: () => void; onLater: () => void }) {
  const { dog, entries, bones, fog, communes, walks } = useData()
  const today = useToday()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const name = dogName(dog)
  const lines = autoWalkLines(track, today)
  const route = useMemo(() => ({ points: track.points.map((p): [number, number] => [p.lat, p.lng]), moments: [] }), [track])

  /** La sortie repérée par l’iPhone au même moment (T-121) : remplacée, plus jamais proposée. */
  const replaceDetected = () => {
    const date = todayISO(new Date(track.startedAt))
    const detected = walks.find((w) => w.date === date)?.detected
    if (!detected) return
    const same = overlapsTrack(track, detected.filter((d) => d.status === 'pending'))
    if (same.length) saveDetected(new Map([[date, detected.map((d) => (same.includes(d) ? { ...d, status: 'no' as const } : d))]]))
  }

  const yes = async () => {
    setBusy(true)
    try {
      const result = await importActivities(1, async () => gpsActivity(track.points, track.startedAt), { knownKeys: knownImportKeys(entries), bones, fog, communes, today, times: walkTimes(dog.walkTimes) }, () => undefined, { source: 'gps', auto: true })
      replaceDetected()
      await FlairNative.clearAutoWalk({ id: track.id })
      const saved = result.walks[0]
      const amount = result.gained.filter((b) => b.reason === 'note').reduce((sum, b) => sum + b.amount, 0)
      haptic('success')
      const label = saved ? `${saved.name} notée` : 'Balade notée'
      toast(amount ? <BonesGained label={label} amount={amount} /> : label, undefined, amount ? { bones: true } : undefined)
      onDone()
    } catch (error) {
      console.error('Balade enregistrée seule non gardée', error)
      toast('La balade n’a pas pu être gardée. Elle reste proposée.')
      setBusy(false)
    }
  }

  const no = async () => {
    setBusy(true)
    replaceDetected()
    await FlairNative.clearAutoWalk({ id: track.id }).catch(() => undefined)
    onDone()
  }

  return (
    <Sheet label="Balade enregistrée" onClose={onLater}>
      <h2 className="title-section mt-1">Balade enregistrée</h2>
      <p className="text-[0.9412rem] leading-snug text-[#3F4946]">
        {APP_NAME} vous a suivi en sortant de chez vous. Avec {name}&nbsp;?
      </p>
      <div className="overflow-hidden rounded-card border border-solid border-[#E6EAE7]">
        <RouteMap route={route} height={150} />
        <p className="flex flex-col px-4 py-3">
          <b className="text-[1rem] leading-snug">{lines.when}</b>
          <span className="text-[0.8824rem] leading-snug text-[#3F4946]">{lines.what}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void yes()} className="btn btn-primary min-h-11 flex-[1_1_9rem] px-3 text-[0.9412rem]">
          C’était avec {name}
        </button>
        <button type="button" disabled={busy} onClick={() => void no()} className="btn btn-tertiary min-h-11 flex-[1_1_7rem] px-3 text-[0.9412rem]">
          Pas avec lui
        </button>
      </div>
      <button type="button" onClick={onLater} className="btn-text self-center px-4">
        Plus tard
      </button>
    </Sheet>
  )
}

const ALWAYS_MESSAGE = `Il faut la position «\u00a0Toujours\u00a0». Pour l’activer\u00a0: Réglages › ${APP_NAME} › Position › Toujours.`

/**
 * Le réglage, partagé entre Son profil et la carte de l’accueil (R-116) : même parcours. Allumer demande la position
 * « Toujours » (puis l’autorisation des notifications, pour prévenir au retour) ; tout choix est retenu (`autoWalkCard`).
 */
function useAutoWalkSetting() {
  const { entries, dog } = useData()
  const [config, setConfig] = useState<AutoWalkConfig>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    if (!isNative()) return
    FlairNative.autoWalkConfig().then(setConfig, () => undefined)
  }, [])

  const chosen = () => {
    if (!dog.autoWalkCard?.chosen) updateDog({ autoWalkCard: { ...dog.autoWalkCard, chosen: true } })
  }

  /** `true` : le réglage est dans l’état demandé. */
  const save = async (enabled: boolean, homes: Home[]): Promise<boolean> => {
    setBusy(true)
    try {
      const next = await FlairNative.setAutoWalk({ enabled, homes })
      if (enabled && next.status !== 'always') {
        // Sans « Toujours », iOS ne réveille pas l’app : le réglage reste éteint, la phrase dit où l’activer.
        setConfig(await FlairNative.setAutoWalk({ enabled: false, homes }))
        setMessage(ALWAYS_MESSAGE)
        return false
      }
      setConfig(next)
      setMessage(undefined)
      return true
    } catch (error) {
      console.error('Réglage de la balade enregistrée seule', error)
      return false
    } finally {
      setBusy(false)
    }
  }

  const turnOn = async (): Promise<boolean> => {
    if (!config) return false
    const ok = await save(true, config.homes.length ? config.homes : homeSuggestions(walkItems(entries)))
    if (ok) {
      chosen()
      if (autoWalkNoticeOn(dog.notifications)) await askNotificationPermission().catch(() => undefined)
    }
    return ok
  }

  const turnOff = async () => {
    if (!config) return
    if (await save(false, config.homes)) chosen()
  }

  return { config, busy, setBusy, message, setMessage, save, turnOn, turnOff }
}

/** La phrase qui dit pourquoi, puis « Continuer » (iOS demande alors la position « Toujours »). */
function AutoWalkIntro({ busy, onContinue }: { busy: boolean; onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-field bg-info-soft p-3.5">
      <p className="text-[0.9412rem] leading-snug text-text">
        Pour enregistrer la balade sans rien lancer, {APP_NAME} doit savoir quand vous sortez de chez vous, même app fermée. iOS va demander la position «&nbsp;Toujours&nbsp;». Le GPS ne tourne que pendant les sorties.
      </p>
      <button type="button" disabled={busy} onClick={onContinue} className="btn btn-primary min-h-11 self-start px-4 text-[0.9412rem]">
        Continuer
      </button>
    </div>
  )
}

/**
 * Accueil, app iOS (R-116) : tant que le réglage n’a jamais été choisi, sous « Ses sorties du jour ». « Activer » : même
 * parcours que le réglage ; « Plus tard » : revient dans 7 jours, plus jamais après 2 fois.
 */
export function AutoWalkCard() {
  const { dog } = useData()
  const today = useToday()
  const { config, busy, message, turnOn } = useAutoWalkSetting()
  const [intro, setIntro] = useState(false)
  if (!config || config.enabled || !showAutoWalkCard(dog.autoWalkCard, today)) return null

  return (
    <section aria-label="Nouveau, balades enregistrées seules" className="card flex flex-col gap-2.5 p-[18px]">
      <span className="text-primary surtitre">Nouveau</span>
      <p className="text-[1rem] font-bold leading-snug">Vos balades s’enregistrent seules quand vous partez de chez vous.</p>
      {intro ? (
        <AutoWalkIntro busy={busy} onContinue={() => void turnOn()} />
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIntro(true)} className="btn btn-primary min-h-11 flex-1 px-4 text-[0.9412rem]">
            Activer
          </button>
          <button type="button" onClick={() => updateDog({ autoWalkCard: cardLater(dog.autoWalkCard, today) })} className="btn-text min-h-11 px-4">
            Plus tard
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-[0.8824rem] leading-snug text-primary-dark">
          {message}
        </p>
      )}
    </section>
  )
}

/**
 * Son profil › Réglages › Balades détectées (app iOS) : « Enregistrer le tracé en partant de chez moi », éteint par
 * défaut. Au premier allumage, une phrase dit pourquoi, puis iOS demande la position « Toujours ». Les points de départ
 * proposés : les 2 départs les plus fréquents des balades passées, modifiables.
 */
export function AutoWalkSetting() {
  const { config, busy, setBusy, message, setMessage, save, turnOn, turnOff } = useAutoWalkSetting()
  const [intro, setIntro] = useState(false)

  if (!config) return null
  const on = config.enabled

  const addHere = () => {
    if (!navigator.geolocation) return
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const home = { lat: Math.round(pos.coords.latitude * 1e5) / 1e5, lng: Math.round(pos.coords.longitude * 1e5) / 1e5, name: `Point de départ ${config.homes.length + 1}` }
        void save(config.enabled, [...config.homes, home])
      },
      () => {
        setBusy(false)
        setMessage(`Position introuvable. Vérifiez que la localisation est autorisée pour ${APP_NAME}.`)
      },
      LOCATE_OPTIONS,
    )
  }

  const rename = (i: number, name: string) => {
    const clean = name.trim()
    if (!clean || clean === config.homes[i]?.name) return
    void save(config.enabled, config.homes.map((h, j) => (j === i ? { ...h, name: clean } : h)))
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="title-section">En partant de chez moi</h2>
      <div className="card flex flex-col gap-3 p-4">
        <label className="flex min-h-14 items-center justify-between gap-3.5 py-1">
          <span className="flex flex-col gap-0.5">
            <span className="text-[1rem] font-bold">Enregistrer le tracé en partant de chez moi</span>
            <span className="text-[0.8824rem] leading-snug text-muted">{APP_NAME} suit la balade tout seul, de la sortie au retour</span>
          </span>
          <input type="checkbox" role="switch" {...SWITCH} checked={on || intro} disabled={busy} onChange={() => (on ? void turnOff() : setIntro(!intro))} className="shrink-0 accent-primary" />
        </label>
        {intro && !on && (
          <AutoWalkIntro
            busy={busy}
            onContinue={() => {
              setIntro(false)
              void turnOn()
            }}
          />
        )}
        {on && (
          <div className="flex flex-col gap-1">
            <h3 className="text-[0.8824rem] font-bold text-muted">Mes points de départ</h3>
            <ul className="m-0 flex list-none flex-col p-0">
              {config.homes.map((h, i) => (
                <li key={`${h.lat},${h.lng}`} className="flex min-h-14 items-center gap-3 border-0 border-b border-solid border-divider py-1.5 last:border-b-0">
                  <span aria-hidden="true" className="text-[1.2rem]">⌂</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <input aria-label="Nom du point de départ" defaultValue={h.name} onBlur={(e) => rename(i, e.currentTarget.value)} className="min-h-11 w-full rounded-field border-0 bg-transparent px-0 text-[1rem] font-bold text-text" />
                    <span className="text-[0.8235rem] text-muted">{i === 0 ? 'Votre départ habituel · 150 m autour' : '150 m autour'}</span>
                  </span>
                  <button type="button" disabled={busy} aria-label={`Retirer ${h.name}`} onClick={() => void save(config.enabled, config.homes.filter((_, j) => j !== i))} className="btn-text min-h-11 px-2">
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" disabled={busy} onClick={addHere} className="btn-text min-h-11 self-start px-0">
              + Ajouter un point de départ (ma position)
            </button>
            {config.homes.length === 0 && <p className="text-[0.8824rem] leading-snug text-muted">Ajoutez votre point de départ, là où vous êtes, pour que les balades s’enregistrent.</p>}
          </div>
        )}
        <p className="text-[0.8824rem] leading-snug text-muted">Il faut l’accès à la position «&nbsp;Toujours&nbsp;». Le GPS ne tourne que pendant les sorties&nbsp;; dans la zone, rien n’est suivi.</p>
        {message && (
          <p role="status" className="text-[0.8824rem] leading-snug text-primary-dark">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
