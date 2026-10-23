import { useEffect, useMemo, useState, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { BackLink } from '../../components/BackLink'
import { reducedMotion } from '../../components/maplibre'
import type { Route } from '../../lib/route'
import { REPLAY_DEFAULT_SPEED, REPLAY_SPEEDS, replayAdvance, replayAt, replayHeading, replaySpan, speedLabel, type ReplaySpeed } from '../../lib/walkReplay'
import type { ReplayChannel } from './walkLayer'

/**
 * R-096 « Revoir la balade en 3ᵉ personne », dans le panneau de la carte de l’onglet Balades (R-094) : « ‹ La balade »,
 * lecture/pause, la barre de position (on peut la glisser), les vitesses × 0,5 · × 1 · × 2 · × 4 (× 4 par défaut,
 * T-108). L’horloge de lecture mène la carte : inclinée, la caméra suit le chien et tourne vers où il marche. Le panneau
 * s’ouvre réduit, à la hauteur de ces commandes (R-096) : la carte en grand au-dessus. En haut à droite de la carte,
 * l’heure et la rue.
 * Toucher la carte met en pause (on regarde autour) ; « Lecture » reprend la caméra. « Réduire les animations » : la
 * caméra ne bouge pas d’elle-même (la carte reste sur toute la balade) et la lecture attend qu’on la lance.
 */
export function ReplayPanel({ route, channel, onBack, peekRef, pillSlot }: { route: Route; channel: { current: ReplayChannel }; onBack: () => void; /** Le bas des commandes : ce que montre le panneau réduit. */ peekRef: Ref<HTMLDivElement>; pillSlot: HTMLElement | null }) {
  const span = useMemo(() => replaySpan(route) ?? ([0, 0] as [number, number]), [route])
  const [s, setS] = useState(span[0])
  const [playing, setPlaying] = useState(() => !reducedMotion())
  // La caméra suit le chien, sauf après qu’on a touché la carte (jusqu’à la reprise de la lecture).
  const [follow, setFollow] = useState(true)
  const [speed, setSpeed] = useState<ReplaySpeed>(REPLAY_DEFAULT_SPEED)

  // La lecture : le chien avance à chaque image, à la vitesse choisie ; il s’arrête à la fin.
  useEffect(() => {
    if (!playing) return
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

  // Chaque image va à la carte.
  useEffect(() => {
    const here = replayAt(route, s)
    if (!here) return
    channel.current.frame = { at: { lat: here.lat, lng: here.lng }, heading: replayHeading(route, s), follow: follow && !reducedMotion() }
    channel.current.draw?.()
  }, [s, route, follow, channel])

  // Toucher la carte : pause, la caméra laisse faire.
  useEffect(() => {
    const ch = channel.current
    ch.onTouch = () => {
      setPlaying(false)
      setFollow(false)
    }
    return () => {
      ch.onTouch = undefined
      ch.frame = undefined
    }
  }, [channel])

  const here = replayAt(route, s)
  const start = replayAt(route, span[0])
  const end = replayAt(route, span[1])
  const label = [here?.clock, here?.street].filter(Boolean).join(' · ')
  const play = () => {
    // À la fin, « Lecture » repart du début.
    if (!playing && s >= span[1]) setS(span[0])
    if (!playing) setFollow(true)
    setPlaying(!playing)
  }

  return (
    <>
      <BackLink label="La balade" onClick={onBack} className="-mt-1 -mb-2" />
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
              setFollow(true)
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
      {/* Le panneau réduit s’arrête sous les vitesses. */}
      <div ref={peekRef}>
        {/* Les « × » se lisent seuls : le mot reste pour VoiceOver, la carte garde la place (R-096). */}
        <span id="vitesse" className="sr-only">
          Vitesse
        </span>
        <div role="group" aria-labelledby="vitesse" className="grid grid-cols-4 gap-2">
          {REPLAY_SPEEDS.map((v) => (
            <button key={v} type="button" aria-pressed={v === speed} onClick={() => setSpeed(v)} className={`tap min-h-11 rounded-full border text-[0.8824rem] font-bold whitespace-nowrap ${v === speed ? 'border-primary bg-primary text-white' : 'border-divider bg-surface text-text'}`}>
              {speedLabel(v)}
            </button>
          ))}
        </div>
      </div>
      {/* Pour VoiceOver : l’heure et la rue, dites seulement en pause (pas à chaque image). */}
      <p className="sr-only" aria-live="polite">
        {playing ? '' : label}
      </p>
      {/* En haut à droite de la carte : l’heure et la rue de ce moment. */}
      {pillSlot &&
        label &&
        createPortal(
          <span aria-hidden="true" className="pointer-events-auto flex min-h-11 max-w-full min-w-0 items-center truncate rounded-full bg-surface px-3.5 text-[0.8824rem] font-bold whitespace-nowrap text-text shadow-float tabular-nums">
            {label}
          </span>,
          pillSlot,
        )}
    </>
  )
}
