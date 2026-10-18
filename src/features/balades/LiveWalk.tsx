import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ConfirmSheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { knownImportKeys } from '../../lib/activity'
import { knownFog, revealedCells } from '../../lib/fog'
import { chrono, elapsedMs, gpsActivity, gpsDistance, tooShort, type GpsPoint } from '../../lib/gpsWalk'
import { formatRouteDistance } from '../../lib/route'
import { useToday } from '../../lib/useToday'
import { walkTimes } from '../../lib/walks'
import { isNative } from '../../native'
import { FlairNative } from '../../native/flair'
import { ExplorerMap } from './ExplorerMap'
import { importActivities } from './importRun'

type Phase = 'starting' | 'walking' | 'denied' | 'saving'

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
  const finishing = useRef(false)

  const finish = async () => {
    if (finishing.current) return
    finishing.current = true
    setPhase('saving')
    const walk = await FlairNative.stopWalk()
    if (!walk.startedAt || tooShort(walk.points, walk.startedAt, Date.now())) {
      toast('Balade trop courte, elle n’a pas été gardée.')
      return navigate('/', { replace: true })
    }
    const result = await importActivities(1, async () => gpsActivity(walk.points, walk.startedAt!), { knownKeys: knownImportKeys(entries), bones, fog, communes, today, times: walkTimes(dog.walkTimes) }, () => undefined, { source: 'gps' })
    navigate(result.walks.length ? '/importer/resultat' : '/', { replace: true })
  }

  // Au départ : démarrer (ou reprendre) la balade, ou la terminer tout de suite (« Terminer » depuis l’accueil).
  useEffect(() => {
    if (!isNative()) return
    let alive = true
    ;(async () => {
      const current = await FlairNative.currentWalk()
      if (params.get('terminer') && current.active) return finish()
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
        <p className="text-[15px] text-[#3F4946]">Vous pouvez verrouiller l’iPhone : le GPS continue.</p>
        <button type="button" onClick={() => void finish()} disabled={phase !== 'walking'} className="btn btn-main min-h-[60px] text-[19px]">
          {phase === 'saving' ? 'Enregistrement…' : 'Terminer'}
        </button>
        <button type="button" onClick={() => setConfirmCancel(true)} disabled={phase !== 'walking'} className="btn btn-quiet min-h-11 self-center px-4 text-[15px]">
          Annuler
        </button>
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
