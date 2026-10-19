import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ConfirmSheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { knownImportKeys } from '../../lib/activity'
import { knownFog, revealedCells } from '../../lib/fog'
import { chrono, elapsedMs, gpsActivity, gpsDistance, tooShort, type GpsPoint } from '../../lib/gpsWalk'
import { formatRouteDistance } from '../../lib/route'
import { errorText, withTimeout } from '../../lib/timeout'
import { isFirestoreCrash } from '../../lib/firestoreCrash'
import { recoverFromFirestoreCrash } from '../../firebase/recover'
import { useToday } from '../../lib/useToday'
import { walkTimes } from '../../lib/walks'
import { isNative } from '../../native'
import { FlairNative } from '../../native/flair'
import { ExplorerMap } from './ExplorerMap'
import { importActivities } from './importRun'

type Phase = 'starting' | 'walking' | 'denied' | 'saving' | 'failed'

/** Délais maximum (R-042) : l’arrêt du GPS, puis l’enregistrement. Au-delà, un message et « Réessayer ». */
const STOP_MS = 10_000
const SAVE_MS = 15_000

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
  const [stopped, setStopped] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [failure, setFailure] = useState<Failure>()
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
      if (!walk.startedAt || tooShort(walk.points, walk.startedAt, walk.stoppedAt ? Date.parse(walk.stoppedAt) : Date.now())) {
        step = 'effacement (clearWalk)'
        await withTimeout(FlairNative.clearWalk(), STOP_MS, 'clearWalk')
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
      // Enregistrée (dans le cache Firestore, qui l’envoie dès qu’il y a du réseau) : on peut effacer la copie de l’iPhone.
      step = 'effacement (clearWalk)'
      await withTimeout(FlairNative.clearWalk(), STOP_MS, 'clearWalk')
      navigate(result.walks.length ? '/importer/resultat' : '/', { replace: true })
    } catch (error) {
      console.error('Balade non enregistrée', step, error)
      setFailure({ step, error: errorText(error), points: count, ...(started ? { startedAt: started } : {}) })
      setPhase('failed')
      finishing.current = false
      // Firestore en panne (R-042) : l’app se recharge et rouvre cet écran, qui enregistre la balade gardée sur l’iPhone.
      if (isFirestoreCrash(error)) recoverFromFirestoreCrash()
    }
  }

  const copyDetail = () => {
    if (!failure) return
    const text = [`Étape : ${failure.step}`, `Erreur : ${failure.error}`, `Points : ${failure.points}`, `Départ : ${failure.startedAt ?? '?'}`, `Réseau : ${navigator.onLine ? 'oui' : 'non'}`, `Heure : ${new Date().toISOString()}`, `Navigateur : ${navigator.userAgent}`].join('\n')
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
      const current = await FlairNative.currentWalk()
      if (current.active && current.startedAt) {
        setStartedAt(current.startedAt)
        setPoints(current.points)
      }
      // « Terminer » depuis l’accueil, ou une balade déjà arrêtée qui attend d’être enregistrée (R-042).
      if (current.active && (params.get('terminer') || current.stopped)) return finish()
      if (!current.active && !params.get('depart')) return navigate('/', { replace: true })
      try {
        const walk = current.recording || current.autoStopped ? current : await FlairNative.startWalk()
        if (!alive) return
        setStartedAt(walk.startedAt)
        setPoints(walk.points)
        setStopped(Boolean(walk.autoStopped))
        setPhase('walking')
      } catch {
        if (alive) setPhase('denied')
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
    const handles = [FlairNative.addListener('walkPoint', (point) => setPoints((list) => [...list, point])), FlairNative.addListener('walkStopped', () => setStopped(true))]
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
  const cells = useMemo(() => {
    const all = knownFog(fog)
    for (const cell of revealedCells(points)) all.add(cell)
    return all
  }, [fog, points])
  const tracks = useMemo(() => (latLngs.length > 1 ? [{ id: 'en-cours', color: '#F2B544', points: latLngs }] : []), [latLngs])
  const here = latLngs[latLngs.length - 1]

  if (!isNative()) return <Navigate to="/" replace />

  if (phase === 'denied')
    return (
      <main className="flex min-h-dvh flex-col justify-end gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <h1 className="font-display text-[26px] leading-tight font-extrabold">La position n’est pas autorisée</h1>
        <p className="text-[17px] leading-snug text-[#3F4946]">Pour enregistrer la balade : Réglages › Flair › Position › « Pendant l’utilisation de l’app ».</p>
        <button type="button" onClick={() => navigate('/', { replace: true })} className="btn btn-main min-h-[56px]">
          Retour à l’accueil
        </button>
      </main>
    )

  return (
    <main className="fixed inset-0 flex flex-col bg-bg">
      <div className="relative min-h-0 flex-1">
        {/* La carte suit le chien : centrée sur le dernier point, au-dessus du panneau. */}
        <ExplorerMap cells={cells} tracks={tracks} me={here} center={here} focus={here} places={[]} satellite={false} three={false} dogName={dog.name} />
      </div>
      <section aria-label="Balade en cours" className="flex flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
        <span className="text-[13px] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">{stopped ? 'Arrêtée après 3 h' : 'Balade en cours'}</span>
        <div className="flex items-end justify-between gap-3">
          <span className="font-display text-[44px] leading-none font-extrabold tabular-nums" aria-label="Durée">
            {startedAt ? chrono(elapsedMs(startedAt, now)) : '0:00'}
          </span>
          <span className="text-[22px] font-extrabold text-primary" aria-label="Distance">
            {formatRouteDistance(gpsDistance(points))}
          </span>
        </div>
        {phase === 'failed' ? (
          <>
            <p role="alert" className="text-[15px] leading-snug font-semibold text-danger">
              La balade n’a pas pu être enregistrée. Elle est gardée sur l’iPhone : rien n’est perdu.
            </p>
            <button type="button" onClick={() => void finish()} className="btn btn-main min-h-[60px] text-[19px]">
              Réessayer
            </button>
            <button type="button" onClick={copyDetail} className="btn btn-quiet min-h-11 self-center px-4 text-[15px]">
              Copier le détail
            </button>
          </>
        ) : (
          <>
            <p className="text-[15px] text-[#3F4946]">Vous pouvez verrouiller l’iPhone : le GPS continue.</p>
            <button type="button" onClick={() => void finish()} disabled={phase !== 'walking'} className="btn btn-main min-h-[60px] text-[19px]">
              {phase === 'saving' ? 'Enregistrement…' : 'Terminer'}
            </button>
            <button type="button" onClick={() => setConfirmCancel(true)} disabled={phase !== 'walking'} className="btn btn-quiet min-h-11 self-center px-4 text-[15px]">
              Annuler
            </button>
          </>
        )}
      </section>
      {confirmCancel && (
        <ConfirmSheet
          title="Ne pas garder cette balade ?"
          message="Le tracé sera effacé : pas de brouillard levé, pas d’os."
          confirmLabel="Ne pas la garder"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={async () => {
            await FlairNative.cancelWalk()
            navigate('/', { replace: true })
          }}
        />
      )}
    </main>
  )
}
