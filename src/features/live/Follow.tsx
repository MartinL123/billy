import { useEffect, useRef, useState } from 'react'
import { addMarker, createMap, dot, lngLat, ROUTE_COLOR, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { watchLive } from '../../firebase/live'
import { followSentence, isToken, liveExpired, updatedSentence, type LiveDoc } from '../../lib/liveShare'

/** Sans réponse du serveur au bout de ce délai, on dit calmement que le lien ne mène nulle part. */
const WAIT_MS = 10_000

/** La position du moment, sur une carte qui la suit. */
function FollowMap({ at }: { at: LatLng }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap>(undefined)
  const marker = useRef<Marker>(undefined)
  useEffect(() => {
    if (!box.current) return
    const m = createMap(box.current, { center: at, zoom: 16 })
    map.current = m
    marker.current = addMarker(m, at, dot(ROUTE_COLOR, 24, 'Position'))
    return () => {
      m.remove()
      map.current = undefined
    }
    // La carte se crée une fois ; la position bouge ensuite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    marker.current?.setLngLat(lngLat(at))
    map.current?.jumpTo({ center: lngLat(at) })
  }, [at[0], at[1]])
  return <div ref={box} role="img" aria-label="Carte de la position du moment" className="absolute inset-0" />
}

/**
 * « Suivre » (T-087, spec V6 § 7) : la page ouverte depuis le lien partagé, sans compte. La carte avec la position,
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
  return (
    <main className="fixed inset-0 flex flex-col bg-bg">
      <div className="relative min-h-0 flex-1 bg-placeholder">{at && <FollowMap at={at} />}</div>
      <section aria-label="La balade" className="flex flex-col gap-1.5 rounded-t-[26px] bg-surface px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
        <span className="flex items-center gap-2 text-milestone-dark surtitre">
          {!ended && <span aria-hidden="true" className="live-dot size-2.5 rounded-full bg-[#BF5519]" />}
          {ended ? 'Partage terminé' : 'En direct'}
        </span>
        <h1 className="title-section" aria-live="polite">
          {followSentence(live, now)}
        </h1>
        {!ended && <p className="text-[0.9412rem] text-[#3F4946]">{updatedSentence(live.updatedAt, now)}</p>}
        {ended && <p className="text-[0.9412rem] text-[#3F4946]">La position n’est plus partagée.</p>}
      </section>
    </main>
  )
}
