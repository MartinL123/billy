import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { nearestSnap, type Snap } from '../../lib/sheetSnap'

// Le panneau glissant du bas de la carte : celui des balades et celui d’une balade mise en avant (même geste partout).
// R-077 : trois crans comme dans Plans. Réduit (poignée et titre), moitié (à l’ouverture), haut (juste sous les
// boutons de la carte). Hors du cran haut, glisser n’importe où déplace le panneau et la liste ne défile pas ; au cran
// haut, la liste défile, et tout en haut de la liste, tirer vers le bas fait redescendre le panneau.

export type { Snap }

const SNAP_EASE = 'transform 0.34s cubic-bezier(0.3, 1.15, 0.5, 1)'

export function useSheet({ start = 'half', peekRef, bottomInset = 0 }: { start?: Snap; /** Le bas de cet élément borne la partie visible réduit (sinon : le haut du contenu). */ peekRef?: RefObject<HTMLElement | null>; /** Hauteur couverte en bas par une barre fixe (l’action principale). */ bottomInset?: number } = {}) {
  const ref = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [snap, setSnap] = useState<Snap>(start)
  const [positions, setPositions] = useState<Record<Snap, number>>({ full: 0, half: 0, collapsed: 0 })
  const drag = useRef<{ y: number; t: number; from: number; moving: boolean; id: number; fromBody: boolean } | null>(null)
  const moved = useRef(false)

  // Les trois positions (translateY), recalculées si la taille change.
  useLayoutEffect(() => {
    const el = ref.current
    const body = bodyRef.current
    if (!el || !body) return
    const measure = () => {
      const height = el.offsetHeight
      const container = el.parentElement?.clientHeight ?? height
      // (Le panneau et son titre bougent ensemble : l’écart entre eux ne dépend pas du cran.)
      const peekBottom = peekRef?.current ? peekRef.current.getBoundingClientRect().bottom - el.getBoundingClientRect().top : body.offsetTop
      const half = Math.max(0, height - container / 2)
      const collapsed = Math.max(half, height - peekBottom - 12 - bottomInset)
      setPositions({ full: 0, half, collapsed })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.parentElement) observer.observe(el.parentElement)
    return () => observer.disconnect()
  }, [peekRef, bottomInset])

  // Hors du cran haut, la liste revient en haut ; tout en haut, tirer vers le bas reste au panneau (touch-action).
  const syncTouch = () => {
    const body = bodyRef.current
    if (body) body.style.touchAction = snap === 'full' ? (body.scrollTop <= 0 ? 'pan-up pan-x' : 'pan-y pan-x') : 'pan-x'
  }
  useEffect(() => {
    if (snap !== 'full' && bodyRef.current) bodyRef.current.scrollTop = 0
    syncTouch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap])

  const offset = positions[snap]
  const place = (y: number, animate: boolean) => {
    if (!ref.current) return
    ref.current.style.transition = animate ? SNAP_EASE : 'none'
    ref.current.style.transform = `translateY(${y}px)`
  }

  const settle = (next: Snap) => {
    setSnap(next)
    place(positions[next], true)
  }

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      const inBody = Boolean(bodyRef.current?.contains(e.target as Node))
      // Au cran haut, le doigt dans une liste défilée la fait défiler.
      if (snap === 'full' && inBody && (bodyRef.current?.scrollTop ?? 0) > 0) return
      drag.current = { y: e.clientY, t: e.timeStamp, from: offset, moving: false, id: e.pointerId, fromBody: inBody }
      moved.current = false
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const dy = e.clientY - d.y
      if (!d.moving) {
        if (Math.abs(dy) < 6) return
        // Au cran haut, monter dans la liste la fait défiler : le panneau ne bouge pas.
        if (snap === 'full' && d.fromBody && dy < 0) {
          drag.current = null
          return
        }
        d.moving = true
        ref.current?.setPointerCapture(e.pointerId)
      }
      // Au-delà des bords, le panneau résiste (un tiers du geste).
      const raw = d.from + dy
      const max = positions.collapsed
      const y = raw < 0 ? raw / 3 : raw > max ? max + (raw - max) / 3 : raw
      place(y, false)
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current
      drag.current = null
      if (!d?.moving) return
      moved.current = true
      const dy = e.clientY - d.y
      settle(nearestSnap(positions, d.from + dy, dy / Math.max(1, e.timeStamp - d.t)))
    },
    onPointerCancel: () => {
      if (drag.current?.moving) place(offset, true)
      drag.current = null
    },
    // Un glissé ne déclenche pas le bouton ou le lien sous le doigt.
    onClickCapture: (e: MouseEvent) => {
      if (!moved.current) return
      moved.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }

  /** La poignée : réduit → moitié → haut → moitié. */
  const cycle = () => settle(snap === 'collapsed' ? 'half' : snap === 'half' ? 'full' : 'half')

  return {
    ref,
    bodyRef,
    snap,
    setSnap: settle,
    cycle,
    collapsed: snap === 'collapsed',
    handlers,
    onBodyScroll: syncTouch,
    style: { transform: `translateY(${offset}px)`, transition: SNAP_EASE },
    handleLabel: snap === 'collapsed' ? 'Afficher le panneau' : snap === 'half' ? 'Agrandir le panneau' : 'Réduire le panneau',
  }
}
