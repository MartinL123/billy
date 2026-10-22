import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { formatDuration } from '../../lib/balade'
import { fitView, projectInView } from '../../lib/miniMapView'
import { formatRouteDistance, routeMomentInfo } from '../../lib/route'
import { walkPills } from '../../lib/walkJournal'
import type { WalkItem } from '../../lib/walkList'
import { tellQueue } from '../../lib/walkTell'
import { canDrawMiniMaps, knownImage, miniCardKey, miniMapCard } from '../trajets/miniMap'

/** Hauteur de la mini-carte d’une balade du journal (maquette V6-Billy-et-journal). */
const MAP_H = 130
/** Marge autour du tracé : une photo de 30 px posée au bord reste entière. */
const PAD = 22

export interface PinnedPhoto {
  thumbFileId: string
  lat: number
  lng: number
}

/**
 * Une balade du journal (T-097, V6.1 § 4) : la mini-carte sur vrai fond (tracé vert, arrêts en points, photos posées là
 * où elles ont été prises), « N à raconter » s’il reste des arrêts sans repère, le nom, durée · distance · arrêts, et
 * les repères sur une seule ligne (la dernière pastille coupée en fondu). Un toucher ouvre sa fiche (T-098).
 */
export function JournalWalkCard({ walk, photos, state }: { walk: WalkItem; photos: PinnedPhoto[]; state?: unknown }) {
  const route = walk.route
  const untold = tellQueue(route).length
  const stops = route.stops?.length ?? 0
  const pills = walkPills(route)
  const details = [route.durationMin ? formatDuration(route.durationMin) : '', formatRouteDistance(route.distanceM), stops ? `${stops} arrêt${stops > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ')
  return (
    <Link to={`/souvenir/${encodeURIComponent(walk.id)}`} state={state} aria-label={`${walk.name}. ${details}${untold ? `. ${untold} à raconter` : ''}. Ouvrir sa fiche`} className="tap flex flex-col overflow-hidden rounded-card border border-solid border-divider bg-surface shadow-card text-text no-underline">
      <RouteMap route={route} photos={photos} untold={untold} />
      <span className="flex min-w-0 flex-col gap-1.5 px-3.5 pt-2.5 pb-3">
        <span className="title-card">{walk.name}</span>
        <span className="flex gap-3 text-[0.8235rem] text-[#3F4946]">
          {route.durationMin ? <b className="text-text">{formatDuration(route.durationMin)}</b> : null}
          <b className="text-text">{formatRouteDistance(route.distanceM)}</b>
          {stops > 0 && (
            <span>
              <b className="text-text">{stops}</b> arrêt{stops > 1 ? 's' : ''}
            </span>
          )}
        </span>
        {pills.length > 0 && (
          <span className="-mr-3.5 flex gap-1.5 overflow-hidden [mask-image:linear-gradient(to_right,#000_85%,transparent)]">
            {pills.map((p) => (
              <span key={p.label} className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7647rem] font-bold whitespace-nowrap ${p.hard ? 'bg-[#FBE6D4] text-[#8A3E0C]' : 'bg-primary-soft text-primary'}`}>
                {p.label}
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  )
}

/**
 * Une mini-carte large et basse : l’image (dessinée une fois à l’écran), puis par-dessus, au même cadrage, les arrêts
 * et les photos. Sert aussi aux « Idées de balade » (plus petite, sans arrêts).
 */
export function RouteMap({ route, photos = [], untold = 0, height = MAP_H, pad = PAD }: { route: Pick<WalkItem['route'], 'points' | 'stops' | 'moments'>; photos?: PinnedPhoto[]; untold?: number; height?: number; pad?: number }) {
  const MAP_H = height
  const ref = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Arrondie à 10 px : une rotation ou un petit écart de mise en page ne redessine pas toutes les cartes.
    const measure = () => setWidth(Math.round(el.clientWidth / 10) * 10)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const points = route.points
  const view = useMemo(() => (width && points.length > 1 ? fitView(points, width, MAP_H, pad) : undefined), [points, width, MAP_H, pad])
  const key = width ? miniCardKey(points, width, MAP_H) : ''
  const [drawn, setDrawn] = useState<{ key: string; url: string }>()
  const image = drawn?.key === key ? drawn.url : key ? knownImage(key) : undefined

  useEffect(() => {
    const el = ref.current
    if (image || !el || !view || !canDrawMiniMaps()) return
    let live = true
    const observer = new IntersectionObserver(
      (seen) => {
        if (!seen.some((s) => s.isIntersecting)) return
        observer.disconnect()
        void miniMapCard(points, width, MAP_H, view).then((url) => live && url && setDrawn({ key, url }))
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => {
      live = false
      observer.disconnect()
    }
    // La clé résume le tracé et la taille.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, image])

  const at = (lat: number, lng: number) => (view ? projectInView(view, width, MAP_H, [lat, lng]) : { x: 0, y: 0 })
  const path = view ? points.map(([lat, lng], i) => `${i ? 'L' : 'M'}${at(lat, lng).x.toFixed(1)} ${at(lat, lng).y.toFixed(1)}`).join(' ') : ''
  const stops = route.stops ?? []
  return (
    <span ref={ref} aria-hidden="true" className="relative block w-full shrink-0 overflow-hidden bg-[#E9ECE6]" style={{ height: MAP_H }}>
      {image && <img src={image} alt="" width={width} height={MAP_H} className="absolute inset-0 block h-full w-full" />}
      {view && (
        <svg width={width} height={MAP_H} className="absolute inset-0">
          {/* Sans image (hors ligne, jamais vue) : le tracé seul, au même endroit. */}
          {!image && (
            <>
              <path d={path} fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <path d={path} fill="none" stroke="var(--color-route)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={at(points[0]![0], points[0]![1]).x} cy={at(points[0]![0], points[0]![1]).y} r="5" fill="#1E5A50" stroke="#FFFFFF" strokeWidth="2" />
            </>
          )}
          {stops.map((s, i) => {
            const moment = s.momentIndex !== undefined ? route.moments[s.momentIndex] : undefined
            const p = at(s.lat, s.lng)
            return <circle key={i} cx={p.x} cy={p.y} r="5.5" fill={moment && moment.type !== 'araconter' ? routeMomentInfo(moment.type).color : '#7E8A85'} stroke="#FFFFFF" strokeWidth="2" />
          })}
        </svg>
      )}
      {view &&
        photos.map((photo, i) => {
          const p = at(photo.lat, photo.lng)
          return (
            <span key={`${photo.thumbFileId}-${i}`} className="absolute size-[30px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[2.5px] border-solid border-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]" style={{ left: p.x, top: p.y }}>
              <FileImage fileId={photo.thumbFileId} alt="" className="size-full" />
            </span>
          )
        })}
      {untold > 0 && <span className="whitespace-nowrap absolute top-2 right-2 rounded-full bg-gold-soft px-2.5 py-1 text-[0.7647rem] font-bold text-[#8A6514]">{untold} à raconter</span>}
    </span>
  )
}
