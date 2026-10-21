import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Sheet } from '../../components/Sheet'
import { CheckIcon, CloseIcon, PawIcon } from '../../components/Icons'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { waitForPendingWrites } from 'firebase/firestore'
import { db } from '../../firebase/app'
import { knownImportKeys, parisMinutes } from '../../lib/activity'
import { knownFog, revealedCells } from '../../lib/fog'
import { doubtfulSegments, durationParts, elapsedMs, endWalkPills, gpsActivity, gpsDistance, territoryBits, tooShort, weakSignal, type GpsPoint } from '../../lib/gpsWalk'
import { dayBudget, minutesOfDay, walksOfDay } from '../../lib/walkDay'
import { formatRouteDistance } from '../../lib/route'
import { errorText, withTimeout } from '../../lib/timeout'
import { isFirestoreCrash } from '../../lib/firestoreCrash'
import { ensureSavedLocally, NotSavedError } from '../../lib/localSave'
import { endDecision, entriesToVerify } from '../../lib/walkFinish'
import { entryInLocalCache, noteWalk } from '../../firebase/imports'
import { todayISO } from '../../lib/dates'
import { recoverFromFirestoreCrash } from '../../firebase/recover'
import { useToday } from '../../lib/useToday'
import { slotForStart, walkName, walkTimes, WALK_SLOTS, type WalkSlot } from '../../lib/walks'
import { isNative } from '../../native'
import { FlairNative } from '../../native/flair'
import { ExplorerMap } from './ExplorerMap'
import { importActivities } from './importRun'
import { logEvent } from '../../firebase/journal'

const toMin = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

type Phase = 'starting' | 'walking' | 'denied' | 'saving' | 'failed'

/** Délais maximum (R-042) : l’arrêt du GPS, puis l’enregistrement. Au-delà, un message et « Réessayer ». */
const STOP_MS = 10_000
const SAVE_MS = 15_000
/** T-061 : attente de la confirmation du serveur avant d’effacer la copie de l’iPhone (sinon, gardée « à envoyer »). */
const SEND_MS = 5_000

/** « Belle balade ! » (V5, T-051) : ce qui s’affiche une fois la balade enregistrée. */
interface Ended {
  entryId: string
  ms: number
  distanceM: number
  pills: string[]
}

/** Ce qui a échoué, pour « Copier le détail ». */
interface Failure {
  step: string
  error: string
  points: number
  startedAt?: string
}

/**
 * « Balade en cours » (app iOS, T-036) : plein écran, une seule action. Chrono, distance, le tracé qui avance et le
 * brouillard qui se lève ; « Terminer » en bas. Verrouiller l’iPhone n’arrête rien ; l’écran reste allumé ici.
 */
export default function LiveWalk() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { dog, entries, bones, fog, communes } = useData()
  const today = useToday()
  const [phase, setPhase] = useState<Phase>('starting')
  const [startedAt, setStartedAt] = useState<string>()
  const [points, setPoints] = useState<GpsPoint[]>([])
  /** Arrêtée toute seule après 3 h (R-043) : le chrono se fige à cette heure-là. */
  const [stoppedAt, setStoppedAt] = useState<string>()
  const [now, setNow] = useState(Date.now())
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [failure, setFailure] = useState<Failure>()
  const [ended, setEnded] = useState<Ended>()
  const [gone, setGone] = useState(false)
  /** T-060 : arrêtée sans assez de positions GPS pour un tracé ; on demande au lieu d’effacer. */
  const [fewPoints, setFewPoints] = useState<{ minutes: number; date: string; slot: WalkSlot; time: string }>()
  /** T-060 : « Position exacte » coupée dans Réglages : le GPS ne donne qu’une position approximative. */
  const [reduced, setReduced] = useState(false)
  /** T-062 : l’iPhone n’a plus de place pour écrire les points. */
  const [storageFull, setStorageFull] = useState(false)
  /** La précision du GPS et depuis quand elle est mauvaise (V5) : « Le GPS cherche le ciel ». */
  const [accuracy, setAccuracy] = useState<number>()
  const [weakSince, setWeakSince] = useState<number>()
  /** « Nouveau bout de territoire ! » : affichée 3 s quand le tracé lève une zone jamais vue. */
  const [found, setFound] = useState(false)
  const { walks } = useData()
  const finishing = useRef(false)
  // Les données les plus récentes : « Réessayer » voit la balade déjà enregistrée (doublon écarté par sa clé).
  const data = useRef({ dog, entries, bones, fog, communes, today })
  data.current = { dog, entries, bones, fog, communes, today }

  /**
   * « Terminer » (R-042) : arrêter le GPS, enregistrer, puis seulement effacer la balade de l’iPhone. Chaque étape a un
   * délai maximum ; en cas d’échec, la balade reste gardée sur l’iPhone et l’écran propose « Réessayer ».
   */
  const finish = async () => {
    if (finishing.current) return
    finishing.current = true
    setPhase('saving')
    setFailure(undefined)
    let step = 'arrêt du GPS (stopWalk)'
    let count = points.length
    let started = startedAt
    try {
      const walk = await withTimeout(FlairNative.stopWalk(), STOP_MS, 'stopWalk')
      count = walk.points.length
      started = walk.startedAt
      const endedAt = walk.stoppedAt ? Date.parse(walk.stoppedAt) : Date.now()
      const decision = walk.startedAt ? endDecision(tooShort(walk.points, walk.startedAt, endedAt), elapsedMs(walk.startedAt, endedAt)) : 'effacer'
      if (decision === 'demander' && walk.startedAt) {
        // Pas d’effacement silencieux : la sortie a eu lieu, on peut au moins la noter (la copie reste sur l’iPhone).
        const start = new Date(walk.startedAt)
        const t = walkTimes(data.current.dog.walkTimes)
        const minutes = Math.max(1, Math.round(elapsedMs(walk.startedAt, endedAt) / 60_000))
        const nearest = [...WALK_SLOTS].sort((a, b) => Math.abs(toMin(t[a.id]) - parisMinutes(walk.startedAt!)) - Math.abs(toMin(t[b.id]) - parisMinutes(walk.startedAt!)))[0]!.id
        const near = slotForStart(t, parisMinutes(walk.startedAt)) ?? nearest
        setFewPoints({ minutes, date: todayISO(start), slot: near, time: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` })
        setPhase('walking')
        finishing.current = false
        return
      }
      if (decision === 'effacer') {
        step = 'effacement (clearWalk)'
        await withTimeout(FlairNative.clearWalk(), STOP_MS, 'clearWalk')
        logEvent({ type: 'walk_discarded', min: walk.startedAt ? Math.round(elapsedMs(walk.startedAt, endedAt) / 60_000) : 0 })
        toast('Balade trop courte, elle n’a pas été gardée.')
        return navigate('/', { replace: true })
      }
      step = 'enregistrement (importActivities)'
      const d = data.current
      const result = await withTimeout(
        importActivities(1, async () => gpsActivity(walk.points, walk.startedAt!), { knownKeys: knownImportKeys(d.entries), bones: d.bones, fog: d.fog, communes: d.communes, today: d.today, times: walkTimes(d.dog.walkTimes) }, () => undefined, { source: 'gps' }),
        SAVE_MS,
        'enregistrement',
      )
      // Enregistrée ? On relit la base locale (R-045) : si Firestore est en panne, l’écriture a pu ne jamais arriver.
      step = 'vérification (base locale)'
      // T-059 : une balade précise est toujours relue avant d’effacer. Rien d’écrit (« Réessayer » après un
      // enregistrement réussi) : c’est l’entrée qui porte sa clé ; introuvable : on n’efface rien.
      const toVerify = entriesToVerify(result.walks.map((w) => w.entryId), walk.points, data.current.entries)
      if (!toVerify) throw new NotSavedError('balade introuvable dans la base locale')
      await ensureSavedLocally(toVerify, entryInLocalCache)
      // T-061 : la copie de l’iPhone n’est effacée qu’une fois l’envoi au serveur confirmé. Hors ligne, elle est gardée
      // (« à envoyer ») et effacée plus tard par PendingWalksSync ; la balade, elle, est déjà dans la liste.
      step = 'envoi (waitForPendingWrites)'
      const sent = await withTimeout(waitForPendingWrites(db), SEND_MS, 'envoi').then(
        () => true,
        () => false,
      )
      step = sent ? 'effacement (clearWalk)' : 'garde jusqu’à l’envoi (markSaved)'
      if (sent) await withTimeout(FlairNative.clearWalk(), STOP_MS, 'clearWalk')
      else await withTimeout(FlairNative.markSaved({ entryId: toVerify[0]! }), STOP_MS, 'markSaved')
      const saved = result.walks[0]
      if (!saved) {
        toast('Cette balade était déjà enregistrée.')
        return navigate('/', { replace: true })
      }
      // « Belle balade ! » : +3 os (s’ils sont donnés : limite de 3 notes par jour), territoire, sortie notée.
      const noteBones = result.gained.filter((b) => b.reason === 'note').reduce((sum, b) => sum + b.amount, 0)
      const end = walk.stoppedAt ? Date.parse(walk.stoppedAt) : Date.now()
      logEvent({ type: 'walk_saved', source: 'gps', m: Math.round(saved.distanceM), min: Math.round(elapsedMs(walk.startedAt!, end) / 60_000) })
      setEnded({ entryId: saved.entryId, ms: elapsedMs(walk.startedAt!, end), distanceM: saved.distanceM, pills: endWalkPills({ noteBones, bits: territoryBits(newCellsRef.current), ...(slotLabel ? { slotName: slotLabel } : {}) }) })
      setPhase('walking')
    } catch (error) {
      console.error('Balade non enregistrée', step, error)
      logEvent({ type: 'walk_error', step })
      setFailure({ step, error: errorText(error), points: count, ...(started ? { startedAt: started } : {}) })
      setPhase('failed')
      finishing.current = false
      // Firestore en panne (R-042) : l’app se recharge et rouvre cet écran, qui enregistre la balade gardée sur l’iPhone.
      if (isFirestoreCrash(error) || error instanceof NotSavedError) recoverFromFirestoreCrash()
    }
  }

  const copyDetail = () => {
    if (!failure) return
    const text = [`Étape : ${failure.step}`, `Erreur : ${failure.error}`, `Points : ${failure.points}`, `Départ : ${failure.startedAt ?? '?'}`, `Réseau : ${navigator.onLine ? 'oui' : 'non'}`, `Heure : ${new Date().toISOString()}`, `Navigateur : ${navigator.userAgent}`].join('\n')
    navigator.clipboard
      .writeText(text)
      .then(() => toast('Détail copié'))
      .catch(() => toast('Copie impossible'))
  }

  // Au départ : démarrer (ou reprendre) la balade, ou la terminer tout de suite (« Terminer » depuis l’accueil).
  useEffect(() => {
    if (!isNative()) return
    let alive = true
    ;(async () => {
      let found
      try {
        found = await FlairNative.currentWalk()
      } catch (error) {
        // T-062 : jamais d’écran bloqué sur « départ » : l’erreur est nommée, « Réessayer » relance l’écran.
        if (alive) {
          setFailure({ step: 'lecture de la balade (currentWalk)', error: errorText(error), points: 0 })
          setPhase('failed')
        }
        return
      }
      // T-061 : une balade déjà enregistrée qui attend le réseau n’est plus « en cours » : on peut en démarrer une autre.
      const current = found.savedAs ? { ...found, active: false, recording: false, points: [] } : found
      if (current.active && current.startedAt) {
        setStartedAt(current.startedAt)
        setPoints(current.points)
      }
      // « Terminer » depuis l’accueil, ou une balade déjà arrêtée qui attend d’être enregistrée (R-042).
      // (Une balade arrêtée seule après 3 h attend le choix : « Terminer » ou « Ne pas la garder », R-043.)
      if (current.active && (params.get('terminer') || (current.stopped && !current.autoStopped))) {
        // Une balade arrêtée qui attendait d’être enregistrée (R-042) : reprise après un incident.
        if (!params.get('terminer')) logEvent({ type: 'walk_recovered' })
        if (params.get('depart') || params.get('terminer')) navigate('/balade-en-cours', { replace: true })
        return finish()
      }
      if (!current.active && !params.get('depart')) return navigate('/', { replace: true })
      try {
        const resumed = current.recording || current.autoStopped
        const walk = resumed ? current : await FlairNative.startWalk()
        if (!resumed) logEvent({ type: 'walk_start' })
        if (!alive) return
        setReduced(Boolean(walk.reducedAccuracy))
        // T-058 : plus de « ?depart=1 » dans l’adresse une fois la balade lancée ; un rechargement (mise à jour du site,
        // récupération R-042) reprend cette balade, et après la fin il ne peut plus en démarrer une nouvelle.
        if (params.get('depart')) navigate('/balade-en-cours', { replace: true })
        setStartedAt(walk.startedAt)
        setPoints(walk.points)
        setStoppedAt(walk.autoStopped ? walk.stoppedAt : undefined)
        setPhase('walking')
      } catch (error) {
        if (!alive) return
        // T-062 : « position non autorisée » seulement si c’est le cas ; sinon l’erreur est nommée (stockage plein…).
        if ((error as { code?: string })?.code === 'denied') return setPhase('denied')
        setFailure({ step: (error as { code?: string })?.code === 'storage' ? 'départ, stockage de l’iPhone plein' : 'départ (startWalk)', error: errorText(error), points: 0 })
        setPhase('failed')
      }
    })()
    return () => {
      alive = false
    }
    // Une fois, à l’ouverture de l’écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Les points en direct, l’arrêt automatique (3 h), l’écran allumé, le chrono.
  useEffect(() => {
    if (!isNative()) return
    const handles = [
      FlairNative.addListener('walkPoint', (point) => setPoints((list) => [...list, point])),
      FlairNative.addListener('walkStopped', (data) => setStoppedAt(data.stoppedAt ?? new Date().toISOString())),
      FlairNative.addListener('walkError', (data) => data.code === 'storage' && setStorageFull(true)),
      FlairNative.addListener('walkSignal', (data) => {
        setAccuracy(data.accuracy)
        setWeakSince((since) => (data.accuracy > 50 ? (since ?? Date.now()) : undefined))
      }),
    ]
    FlairNative.keepAwake({ on: true }).catch(() => undefined)
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    // De retour au premier plan : les points enregistrés écran verrouillé.
    const resync = () => {
      if (document.visibilityState === 'visible') FlairNative.currentWalk().then((w) => w.active && setPoints(w.points)).catch(() => undefined)
    }
    document.addEventListener('visibilitychange', resync)
    return () => {
      handles.forEach((h) => h.then((handle) => handle.remove()))
      FlairNative.keepAwake({ on: false }).catch(() => undefined)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', resync)
    }
  }, [])

  const latLngs = useMemo(() => points.map((p): [number, number] => [p.lat, p.lng]), [points])
  // Le territoire connu avant la balade : ce que le tracé découvre en plus compte en « bouts de territoire ».
  const knownBefore = useRef<Set<string> | undefined>(undefined)
  if (!knownBefore.current && fog.length) knownBefore.current = knownFog(fog)
  const newCellsRef = useRef(0)
  const cells = useMemo(() => {
    const all = knownFog(fog)
    let fresh = 0
    for (const cell of revealedCells(points)) {
      if (!knownBefore.current?.has(cell)) fresh++
      all.add(cell)
    }
    newCellsRef.current = fresh
    return all
  }, [fog, points])
  const bits = territoryBits(newCellsRef.current)
  const shownBits = useRef(0)
  useEffect(() => {
    if (bits <= shownBits.current) return
    shownBits.current = bits
    setFound(true)
    const timer = window.setTimeout(() => setFound(false), 3000)
    return () => window.clearTimeout(timer)
  }, [bits])
  // La portion douteuse (GPS faible, trou de plus de 20 s) en pointillés ; le reste en trait plein.
  const tracks = useMemo(() => {
    if (latLngs.length < 2) return []
    const out: { id: string; color: string; points: [number, number][]; dashed?: boolean }[] = []
    let from = 0
    doubtfulSegments(points).forEach(([a, b], i) => {
      if (a > from) out.push({ id: `en-cours-${i}`, color: '#F2B544', points: latLngs.slice(from, a + 1) })
      out.push({ id: `douteux-${i}`, color: '#F2B544', points: [latLngs[a]!, latLngs[b]!], dashed: true })
      from = b
    })
    if (from < latLngs.length - 1) out.push({ id: 'en-cours', color: '#F2B544', points: latLngs.slice(from) })
    return out
  }, [latLngs, points])
  const here = latLngs[latLngs.length - 1]
  const startFailed = Boolean(failure && (failure.step.startsWith('départ') || failure.step.startsWith('lecture')))
  const weak = weakSignal(accuracy, weakSince, now)

  // La sortie à laquelle la balade se rattache, et sa durée conseillée : « Ses 15 min du soir sont faites ».
  const times = walkTimes(dog.walkTimes)
  const slot = startedAt ? slotForStart(times, parisMinutes(startedAt)) : undefined
  const slotLabel = slot ? walkName(times[slot]).replace(/^la s/, 'S') : undefined
  const todayWalk = walks.find((w) => w.date === today)
  const budget = dayBudget({ birthDate: dog.birthDate, today, times, done: todayWalk?.done ?? {}, walks: walksOfDay(entries, today, todayWalk?.noted), now: minutesOfDay(new Date()) })
  const advised = budget?.perWalk
  const elapsed = startedAt ? elapsedMs(startedAt, stoppedAt ? Date.parse(stoppedAt) : now) : 0
  const { min, sec } = durationParts(elapsed)
  const distance = formatRouteDistance(gpsDistance(points))

  if (!isNative()) return <Navigate to="/" replace />

  if (phase === 'denied')
    return (
      <main className="flex min-h-dvh flex-col justify-end gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <h1 className="font-display text-[1.5294rem] leading-tight font-extrabold">La position n’est pas autorisée</h1>
        <p className="text-[1rem] leading-snug text-[#3F4946]">Pour enregistrer la balade : Réglages › Flair › Position › « Pendant l’utilisation de l’app ».</p>
        <button type="button" onClick={() => navigate('/', { replace: true })} className="btn btn-main min-h-[56px]">
          Retour à l’accueil
        </button>
      </main>
    )

  const pill = 'flex min-h-11 items-center gap-1.5 rounded-full border-0 bg-surface px-4 text-[0.8824rem] font-bold text-[#3F4946] shadow-[0_2px_8px_rgba(24,32,30,0.16)]'
  return (
    <main className="fixed inset-0 flex flex-col bg-bg">
      <div className="relative min-h-0 flex-1">
        {/* La carte suit le chien : centrée sur le dernier point, au-dessus du panneau. */}
        <ExplorerMap cells={cells} tracks={tracks} me={here} center={here} focus={here} places={[]} satellite={false} three={false} dogName={dog.name} />
        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] flex flex-col items-start gap-2.5">
          {/* « Ne pas garder » quitte le bas de l’écran (V5) : une pilule en haut à gauche. */}
          {!ended && !gone && phase === 'walking' && (
            <button type="button" onClick={() => setConfirmCancel(true)} className={`tap pointer-events-auto ${pill}`}>
              <CloseIcon size={18} />
              Ne pas garder
            </button>
          )}
          {storageFull && !ended && (
            <p role="alert" className="pointer-events-auto self-stretch rounded-[16px] bg-surface px-4 py-3 text-[0.8824rem] leading-snug text-danger shadow-[0_4px_12px_rgba(24,32,30,0.18)]">
              <strong>L’iPhone est plein.</strong> Les nouveaux points ne s’enregistrent plus. Libérez de la place, puis touchez Terminer.
            </p>
          )}
          {reduced && !ended && (
            <p role="status" className="pointer-events-auto self-stretch rounded-[16px] bg-surface px-4 py-3 text-[0.8824rem] leading-snug shadow-[0_4px_12px_rgba(24,32,30,0.18)]">
              <strong>Position approximative.</strong> Pour un tracé, activez « Position exacte » dans Réglages › Flair › Position.
            </p>
          )}
          {weak && !ended && (
            <p role="status" className="pointer-events-auto self-stretch rounded-[16px] bg-surface px-4 py-3 text-[0.8824rem] leading-snug shadow-[0_4px_12px_rgba(24,32,30,0.18)]">
              <strong>Le GPS cherche le ciel.</strong> La balade continue, le tracé se recolle tout seul.
            </p>
          )}
          {found && !ended && (
            <p role="status" className="anim-pop flex items-center gap-2 self-center rounded-full bg-gold-soft px-4 py-2.5 text-[0.8824rem] font-bold text-[#3D2A00] shadow-[0_4px_12px_rgba(24,32,30,0.18)]">
              <PawIcon size={18} color="#8A6514" />
              Nouveau bout de territoire !
            </p>
          )}
        </div>
      </div>

      {ended ? (
        // « Belle balade ! » (V5) : ce que la balade a rapporté, puis « Voir son territoire ».
        <section aria-label="Belle balade" className="animate-sheet flex flex-col items-center gap-3 rounded-t-[26px] bg-surface px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] text-center shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
          <span className="anim-pop flex size-16 items-center justify-center rounded-full bg-primary text-white" style={{ animationDelay: '150ms' }}>
            <CheckIcon size={34} />
          </span>
          <h1 className="font-display text-[1.6471rem] leading-tight font-extrabold">Belle balade !</h1>
          <p className="text-[0.9412rem] text-[#3F4946]">
            {durationParts(ended.ms).min} min {durationParts(ended.ms).sec} s · {formatRouteDistance(ended.distanceM)} avec {dog.name}
          </p>
          {ended.pills.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {ended.pills.map((text, i) => (
                <span key={text} className={`anim-pop rounded-full px-3 py-2 text-[0.8824rem] font-bold ${i === 0 && text.startsWith('+') ? 'bg-gold-soft font-extrabold text-[#3D2A00]' : text.endsWith('notée') ? 'bg-primary-soft text-primary-dark' : 'bg-info-soft text-[#1D4685]'}`} style={{ animationDelay: `${300 + i * 80}ms` }}>
                  {text}
                </span>
              ))}
            </div>
          )}
          <button type="button" onClick={() => navigate(`/territoire?balade=${encodeURIComponent(ended.entryId)}`, { replace: true })} className="btn btn-main mt-1.5 min-h-14 self-stretch">
            Voir son territoire
          </button>
          <button type="button" onClick={() => navigate(`/souvenir/${ended.entryId}/modifier`, { replace: true })} className="btn btn-outline min-h-[50px] self-stretch">
            Ajouter un souvenir
          </button>
        </section>
      ) : gone ? (
        <section aria-label="Balade pas gardée" className="animate-sheet flex flex-col gap-3.5 rounded-t-[26px] bg-surface px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
          <h1 className="font-display text-[1.4118rem] font-extrabold">La balade n’a pas été gardée</h1>
          <p className="text-[0.9412rem] text-[#3F4946]">Vous pourrez noter la sortie à la main depuis l’accueil.</p>
          <button type="button" onClick={() => navigate('/', { replace: true })} className="btn btn-main min-h-14">
            Retour à l’accueil
          </button>
        </section>
      ) : (
        <section aria-label="Balade en cours" className="flex flex-col gap-3.5 rounded-t-[26px] bg-surface px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
          <span className="flex items-center gap-2 text-[0.7647rem] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">
            {!stoppedAt && <span aria-hidden="true" className="live-dot size-2.5 rounded-full bg-[#BF5519]" />}
            {stoppedAt ? 'Arrêtée après 3 h' : `Balade en cours avec ${dog.name}`}
          </span>
          <div className="flex items-end justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-[0.8235rem] font-semibold text-[#5A6662]">Durée</span>
              <span className="font-display text-[2.8235rem] leading-[52px] font-extrabold tabular-nums" aria-label={`${min} minutes ${sec} secondes`}>
                {min}
                <span className="text-[1.4118rem]"> min </span>
                <span className="text-[1.7647rem] text-[#3F4946]">{sec}</span>
                <span className="text-[1.1765rem] text-[#3F4946]"> s</span>
              </span>
            </span>
            <span className="flex flex-col items-end">
              <span className="text-[0.8235rem] font-semibold text-[#5A6662]">Distance</span>
              <span className="font-display text-[1.7647rem] leading-10 font-extrabold text-primary">{weak ? `≈ ${distance}` : distance}</span>
            </span>
          </div>
          {slotLabel && advised && elapsed >= advised * 60_000 && (
            <span className="anim-pop flex items-center gap-1.5 self-start rounded-full bg-primary-soft px-3 py-1.5 text-[0.8235rem] font-bold text-primary-dark">
              <CheckIcon size={16} />
              Ses {advised} min {slotLabel.replace(/^Sortie /, '')} sont faites
            </span>
          )}
          {phase === 'failed' ? (
            <>
              <p role="alert" className="text-[0.8824rem] leading-snug font-semibold text-danger">
                {startFailed ? `La balade n’a pas pu démarrer (${failure?.step}).` : 'La balade n’a pas pu être enregistrée. Elle est gardée sur l’iPhone\u00a0: rien n’est perdu.'}
              </p>
              <button type="button" onClick={() => (startFailed ? window.location.reload() : void finish())} className="btn btn-main min-h-[58px] text-[1.1176rem]">
                Réessayer
              </button>
              <button type="button" onClick={copyDetail} className="btn btn-quiet min-h-11 self-center px-4 text-[0.8824rem]">
                Copier le détail
              </button>
            </>
          ) : (
            <>
              <p className="text-[0.8824rem] text-[#3F4946]">{stoppedAt ? 'L’enregistrement s’est arrêté tout seul au bout de 3 h.' : 'Vous pouvez verrouiller l’iPhone : le GPS continue.'}</p>
              <button type="button" onClick={() => void finish()} disabled={phase !== 'walking'} className="btn btn-main min-h-[58px] text-[1.1176rem]">
                {phase === 'saving' ? 'Enregistrement…' : 'Terminer'}
              </button>
            </>
          )}
        </section>
      )}

      {fewPoints && (
        // T-060 : le GPS n’a presque rien donné. On ne perd pas la sortie : on la note, ou on choisit de ne pas la garder.
        <Sheet label="Le GPS n’a presque rien enregistré" onClose={() => setFewPoints(undefined)}>
          <h2 className="mt-1 font-display text-[1.5294rem] leading-tight font-extrabold">Le GPS n’a presque rien enregistré</h2>
          <p className="text-[0.9412rem] leading-snug text-[#3F4946]">
            {fewPoints.minutes} min de sortie, mais trop peu de positions pour un tracé. Vous pouvez noter la sortie : elle compte dans sa journée.
          </p>
          <button
            type="button"
            onClick={async () => {
              noteWalk({ date: fewPoints.date, slot: fewPoints.slot, minutes: fewPoints.minutes, time: fewPoints.time }, data.current.bones, data.current.today)
              await FlairNative.clearWalk().catch(() => undefined)
              setFewPoints(undefined)
              toast('Sortie notée')
              navigate('/', { replace: true })
            }}
            className="btn btn-main min-h-14"
          >
            Noter la sortie ({fewPoints.minutes} min)
          </button>
          <button
            type="button"
            onClick={async () => {
              await FlairNative.clearWalk().catch(() => undefined)
              logEvent({ type: 'walk_discarded', min: fewPoints.minutes })
              setFewPoints(undefined)
              setGone(true)
            }}
            className="btn min-h-[50px] border-2 border-solid border-danger bg-surface text-danger"
          >
            Ne pas la garder
          </button>
        </Sheet>
      )}

      {confirmCancel && (
        // « Continuer la balade » en orange, « Ne pas la garder » en contour rouge : plus de « Annuler » ambigu (V5).
        <Sheet label="Ne pas garder cette balade ?" onClose={() => setConfirmCancel(false)}>
          <h2 className="mt-1 font-display text-[1.5294rem] leading-tight font-extrabold">Ne pas garder cette balade ?</h2>
          <p className="text-[0.9412rem] leading-snug text-[#3F4946]">Le tracé sera effacé : pas de brouillard levé, pas d’os.</p>
          <button type="button" onClick={() => setConfirmCancel(false)} className="btn btn-main min-h-14">
            Continuer la balade
          </button>
          <button
            type="button"
            onClick={async () => {
              await FlairNative.cancelWalk()
              logEvent({ type: 'walk_discarded', min: Math.round(elapsed / 60_000) })
              setConfirmCancel(false)
              setGone(true)
            }}
            className="btn min-h-[50px] border-2 border-solid border-danger bg-surface text-danger"
          >
            Ne pas la garder
          </button>
        </Sheet>
      )}
    </main>
  )
}
