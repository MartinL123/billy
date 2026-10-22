import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { reducedMotion } from '../../components/maplibre'
import { useData } from '../../firebase/store'
import { readRoute } from '../../lib/route'
import { REPLAY_DEFAULT_SPEED, REPLAY_SPEEDS, replayAdvance, replayAt, replaySpan, speedLabel, type ReplaySpeed } from '../../lib/walkReplay'
import { WalkMap } from './WalkMap'

/**
 * « Revoir la balade » (maquette flair-2026-10-22/Revoir, T-108) : la carte de la balade et un point qui avance sur le
 * trajet ; en haut, l’heure et la rue de ce moment ; en bas, lecture/pause, la barre de position (on peut la glisser)
 * et les vitesses × 0,5 · × 1 · × 2 · × 4 (× 4 par défaut). La carte ne bouge pas toute seule ; si l’iPhone réduit
 * les animations, la lecture attend qu’on la lance.
 */
export default function ReplayWalk() {
  const { id } = useParams()
  const { entries, dog } = useData()
  const navigate = useNavigate()
  const entry = entries.find((e) => e.id === id)
  const route = useMemo(() => readRoute(entry?.route), [entry?.route])
  const span = useMemo(() => (route ? replaySpan(route) : undefined), [route])
  const [s, setS] = useState(() => span?.[0] ?? 0)
  const [playing, setPlaying] = useState(() => !reducedMotion())
  const [speed, setSpeed] = useState<ReplaySpeed>(REPLAY_DEFAULT_SPEED)
  const [panelH, setPanelH] = useState(220)
  const panel = useRef<HTMLDivElement>(null)
  const back = () => navigate(`/souvenir/${id}`, { replace: true })

  // La lecture : le point avance à chaque image, à la vitesse choisie ; il s’arrête à la fin.
  useEffect(() => {
    if (!playing || !span) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      setS((prev) => {
        const next = replayAdvance(prev, dt, speed, span)
        if (next >= span[1]) setPlaying(false)
        return next
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, span])

  useEffect(() => {
    const el = panel.current
    if (!el) return
    const observer = new ResizeObserver(() => setPanelH(Math.round(el.getBoundingClientRect().height)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (!entry || !route || !span) return <Navigate to={id ? `/souvenir/${id}` : '/balades'} replace />
  const here = replayAt(route, s)
  const start = replayAt(route, span[0])
  const end = replayAt(route, span[1])
  const label = [here?.clock, here?.street].filter(Boolean).join(' · ')
  const play = () => {
    // À la fin, « Lecture » repart du début.
    if (!playing && s >= span[1]) setS(span[0])
    setPlaying(!playing)
  }

  return (
    <div className="fixed inset-0 mx-auto max-w-[430px] overflow-hidden bg-bg">
      <WalkMap route={route} dogName={dog.name} runner={here} className="size-full" padding={{ top: 76, bottom: panelH + 24, left: 28, right: 28 }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button type="button" onClick={back} className="tap map-btn shrink-0 pr-4 pl-2 text-[0.9412rem] text-primary">
          <ChevronLeftIcon size={20} strokeWidth={2.6} />
          La balade
        </button>
        {label && (
          <span aria-hidden="true" className="flex min-h-11 min-w-0 items-center truncate rounded-full bg-surface px-3.5 text-[0.8824rem] font-bold whitespace-nowrap text-text shadow-float tabular-nums">
            {label}
          </span>
        )}
      </div>

      <div ref={panel} className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 rounded-t-panel bg-bg px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-panel">
        <div className="flex items-center gap-4">
          <button type="button" onClick={play} aria-label={playing ? 'Pause' : 'Lecture'} className="tap flex size-14 shrink-0 items-center justify-center rounded-full border-0 bg-primary text-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {playing ? <path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <input
              type="range"
              min={span[0]}
              max={span[1]}
              step={1}
              value={Math.round(s)}
              onChange={(e) => {
                setPlaying(false)
                setS(Number(e.target.value))
              }}
              aria-label="Position dans la balade"
              aria-valuetext={label || undefined}
              className="h-11 w-full accent-primary"
            />
            {(start?.clock || end?.clock) && (
              <div aria-hidden="true" className="-mt-1.5 flex justify-between text-[0.7647rem] text-muted tabular-nums">
                <span>{start?.clock}</span>
                <span>{end?.clock}</span>
              </div>
            )}
          </div>
        </div>
        <span id="vitesse" className="text-[0.9412rem] font-bold">
          Vitesse
        </span>
        <div role="group" aria-labelledby="vitesse" className="-mt-1 grid grid-cols-4 gap-2">
          {REPLAY_SPEEDS.map((v) => (
            <button key={v} type="button" aria-pressed={v === speed} onClick={() => setSpeed(v)} className={`tap min-h-11 rounded-full border text-[0.8824rem] font-bold whitespace-nowrap ${v === speed ? 'border-primary bg-primary text-white' : 'border-divider bg-surface text-text'}`}>
              {speedLabel(v)}
            </button>
          ))}
        </div>
        {/* Pour VoiceOver : l’heure et la rue, dites seulement en pause (pas à chaque image). */}
        <p className="sr-only" aria-live="polite">
          {playing ? '' : label}
        </p>
      </div>
    </div>
  )
}
