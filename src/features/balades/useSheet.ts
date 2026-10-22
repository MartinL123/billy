import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { nearestSnap, sheetPositions, type Snap } from '../../lib/sheetSnap'
import { haptic } from '../../native/flair'

// Le panneau glissant du bas de la carte : celui des balades et celui d’une balade mise en avant (même geste partout).
// R-077 : trois crans comme dans Plans. Réduit (poignée et titre), moitié (à l’ouverture), haut (juste sous les
// boutons de la carte). Hors du cran haut, glisser n’importe où déplace le panneau et la liste ne défile pas ; au cran
// haut, la liste défile, et tout en haut de la liste, tirer vers le bas fait redescendre le panneau.
// R-091, R-082 : au cran du milieu, les premières actions (ou la première rangée de balades) sont entières au-dessus de
// l’action fixée en bas ou du rond Accueil (règle : sheetPositions).

/** Le rond Accueil dépasse de 26 px de la barre d’onglets : sans action fixée en bas, le panneau garde 36 px dessous. */
export const HOME_CLEARANCE = 36

export type { Snap }

const SNAP_EASE = 'transform 0.34s cubic-bezier(0.3, 1.15, 0.5, 1)'

export function useSheet({ start = 'half', peekRef, halfRef, bottomInset = 0 }: { start?: Snap; /** Le bas de cet élément borne la partie visible réduit (sinon : le haut du contenu). */ peekRef?: RefObject<HTMLElement | null>; /** Le bas de cet élément est visible au cran du milieu (les premières actions, la première rangée). */ halfRef?: RefObject<HTMLElement | null>; /** Hauteur couverte en bas par une barre fixe (l’action principale) ou le rond Accueil. */ bottomInset?: number } = {}) {
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
      const top = el.getBoundingClientRect().top
      // (Le panneau et son contenu bougent ensemble : l’écart entre eux ne dépend pas du cran ; seul le défilement de la
      // liste, au cran haut, est retiré.)
      const below = (node: HTMLElement) => node.getBoundingClientRect().bottom - top + (body.contains(node) ? body.scrollTop : 0)
      const next = sheetPositions({
        height: el.offsetHeight,
        container: el.parentElement?.clientHeight ?? el.offsetHeight,
        peekBottom: peekRef?.current ? below(peekRef.current) : body.offsetTop,
        halfBottom: halfRef?.current ? below(halfRef.current) : undefined,
        bottomInset,
      })
      setPositions((p) => (p.half === next.half && p.collapsed === next.collapsed ? p : next))
    }
    measure()
    // Le contenu change (une balade mise en avant, un texte agrandi) : les tailles de ses éléments suffisent à le dire.
    const observer = new ResizeObserver(measure)
    const watch = () => {
      observer.disconnect()
      observer.observe(el)
      if (el.parentElement) observer.observe(el.parentElement)
      for (const child of Array.from(body.children)) observer.observe(child)
    }
    watch()
    const added = new MutationObserver(() => {
      watch()
      measure()
    })
    added.observe(body, { childList: true })
    return () => {
      observer.disconnect()
      added.disconnect()
    }
  }, [peekRef, halfRef, bottomInset])

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

  // Petit écran et grand texte : quand le cran du milieu rejoint le haut, le panneau y est « en haut » (la liste
  // défile jusqu’aux actions, toujours au-dessus du rond Accueil ou de l’action fixée).
  const halfIsFull = positions.half === 0 && positions.collapsed > 0
  useEffect(() => {
    if (halfIsFull && snap === 'half') setSnap('full')
  }, [halfIsFull, snap])

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
      const next = nearestSnap(positions, d.from + dy, dy / Math.max(1, e.timeStamp - d.t))
      // R-080 : un léger « clic » quand le panneau s’arrête sur un autre cran.
      if (next !== snap) haptic('selection')
      settle(next)
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
  const cycle = () => settle(snap === 'collapsed' ? (halfIsFull ? 'full' : 'half') : snap === 'half' ? 'full' : halfIsFull ? 'collapsed' : 'half')

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
