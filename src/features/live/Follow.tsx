import { useEffect, useRef, useState } from 'react'
import { addMarker, cameraMs, createMap, dot, fitPoints, lngLat, ROUTE_COLOR, setLine, whenReady, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { watchLive } from '../../firebase/live'
import { followSentence, isToken, liveExpired, trackShown, updatedSentence, type LiveDoc } from '../../lib/liveShare'

/** Sans réponse du serveur au bout de ce délai, on dit calmement que le lien ne mène nulle part. */
const WAIT_MS = 10_000

/**
 * La carte du proche (T-123) : le tracé depuis le départ (couleur des balades) sous le point du moment. La carte suit le
 * point ; déplacée à la main, elle s’arrête de suivre et « Revenir sur Billy » la ramène. Balade finie : le tracé seul,
 * cadré en entier (1 h, puis effacé).
 */
function FollowMap({ at, track, dogName }: { at?: LatLng; track: LatLng[]; dogName: string }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap>(undefined)
  const marker = useRef<Marker>(undefined)
  const [following, setFollowing] = useState(true)
  const follow = useRef(true)
  follow.current = following
  const start = at ?? track[track.length - 1]

  useEffect(() => {
    if (!box.current || !start) return
    const m = createMap(box.current, { center: start, zoom: 16 })
    map.current = m
    // Un geste du proche (glisser, pincer) : la carte ne suit plus le point.
    const stop = (e: { originalEvent?: Event }) => e.originalEvent && setFollowing(false)
    m.on('dragstart', stop)
    m.on('zoomstart', stop)
    m.on('rotatestart', stop)
    return () => {
      m.remove()
      map.current = undefined
      marker.current = undefined
    }
    // La carte se crée une fois ; la position et le tracé bougent ensuite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(start)])

  // Le tracé, sous le point.
  const trackKey = `${track.length}:${track[track.length - 1]?.join(',') ?? ''}`
  useEffect(() => {
    const m = map.current
    if (!m) return
    whenReady(m, () => {
      setLine(m, 'trace-suivre', [track], { color: ROUTE_COLOR, width: 5 })
      // Balade finie : le tracé entier à l’écran.
      if (!at && track.length > 1) fitPoints(m, track, 48)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey, Boolean(at)])

  // Le point du moment ; la carte le suit (sauf si le proche l’a déplacée).
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!at) {
      marker.current?.remove()
      marker.current = undefined
      return
    }
    if (marker.current) marker.current.setLngLat(lngLat(at))
    else marker.current = addMarker(m, at, dot(ROUTE_COLOR, 24, `Position de ${dogName}`))
    if (follow.current) m.easeTo({ center: lngLat(at), duration: cameraMs(600) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at?.[0], at?.[1]])

  const back = () => {
    setFollowing(true)
    if (at) map.current?.easeTo({ center: lngLat(at), zoom: Math.max(map.current.getZoom(), 15), duration: cameraMs(600) })
  }

  return (
    <>
      <div ref={box} role="img" aria-label={at ? `Carte\u00a0: la position de ${dogName} et son trajet depuis le départ` : `Carte\u00a0: le trajet de la balade de ${dogName}`} className="absolute inset-0" />
      <span hidden data-testid="trace-suivre" data-points={track.length} />
      {at && !following && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
          <button type="button" onClick={back} className="tap btn btn-tertiary min-h-11 bg-surface px-4 shadow-float">
            Revenir sur {dogName}
          </button>
        </div>
      )}
    </>
  )
}

/**
 * « Suivre » (T-087, spec V6 § 7) : la page ouverte depuis le lien partagé, sans compte. La carte avec la position et
 * (T-123) le tracé depuis le départ,
 * « Billy et Martin sont en balade depuis 23 min · 1,4 km », « Mis à jour il y a 40 s » ; puis « Balade terminée à
 * 8 h 44 ». Aucune autre donnée.
 */
export default function Follow({ token }: { token: string }) {
  const [live, setLive] = useState<LiveDoc | null>()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    // Un lien coupé ou recopié de travers : rien à demander à Firestore.
    if (!isToken(token)) return setLive(null)
    let answered = false
    const stop = watchLive(token, (doc, fromCache) => {
      // Le cache local seul ne sait pas : on attend le serveur avant de dire « introuvable ».
      if (!doc && fromCache) return
      answered = true
      setLive(doc)
    })
    const timer = window.setTimeout(() => !answered && setLive(null), WAIT_MS)
    return () => {
      stop()
      window.clearTimeout(timer)
    }
  }, [token])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    document.title = live ? `La balade de ${live.dogName}` : 'Flair'
  }, [live])

  if (live === undefined)
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg px-5">
        <p role="status" className="text-[1rem] text-muted">
          Un instant…
        </p>
      </main>
    )

  if (!live || liveExpired(live, now))
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-3 bg-bg px-6 text-center">
        <h1 className="title-screen">Ce lien ne mène plus à une balade</h1>
        <p className="text-[1rem] leading-snug text-[#3F4946]">Le partage est terminé depuis un moment, ou le lien est incomplet. Demandez-en un nouveau à la personne qui vous l’a envoyé.</p>
      </main>
    )

  const ended = live.status === 'terminée'
  const at: LatLng | undefined = !ended && live.lat !== undefined && live.lng !== undefined ? [live.lat, live.lng] : undefined
  const track = trackShown(live, now)
  return (
    <main className="fixed inset-0 flex flex-col bg-bg">
      <div className="relative min-h-0 flex-1 bg-placeholder">{(at || track.length > 1) && <FollowMap {...(at ? { at } : {})} track={track} dogName={live.dogName} />}</div>
      <section aria-label="La balade" className="panel flex flex-col gap-1.5 px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <span className="flex items-center gap-2 text-milestone-dark surtitre">
          {!ended && <span aria-hidden="true" className="live-dot size-2.5 rounded-full bg-[#BF5519]" />}
          {ended ? 'Partage terminé' : 'En direct'}
        </span>
        <h1 className="title-section" aria-live="polite">
          {followSentence(live, now)}
        </h1>
        {!ended && <p className="text-[0.9412rem] text-[#3F4946]">{updatedSentence(live.updatedAt, now)}</p>}
        {ended && <p className="text-[0.9412rem] text-[#3F4946]">{track.length > 1 ? 'La position n’est plus partagée. Le trajet reste visible 1\u00a0h.' : 'La position n’est plus partagée.'}</p>}
      </section>
    </main>
  )
}
