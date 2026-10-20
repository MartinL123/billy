import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'

// Le panneau glissant du bas de la carte : celui des balades et celui d’une balade mise en avant (même geste partout).

/** Réduit, le panneau ne garde que sa poignée, plus cette marge : la carte prend presque tout l’écran. */
const PEEK_MARGIN = 24
/**
 * Petit écran (iPhone SE, R-033) : sous 700 px de haut, le panneau s’ouvre réduit, en laissant voir ses premières
 * lignes (les filtres et la part découverte), pour que la carte et ses boutons restent visibles.
 */
const SMALL_SCREEN = 700
const SMALL_PEEK = 104
const isSmallScreen = () => typeof window !== 'undefined' && window.innerHeight < SMALL_SCREEN
const SNAP = 'transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)'

/**
 * Le panneau glissant : il suit le doigt (glissé vertical seulement, le défilement des filtres reste horizontal),
 * puis se cale ouvert ou réduit selon la vitesse du geste ou la position la plus proche. Ouvert, il monte au plus à
 * la moitié de l’écran ; la suite se lit en faisant défiler son contenu (le panneau se glisse alors par sa poignée).
 */
export function useSheet({ startCollapsed }: { /** Réduit au départ (sinon : réduit seulement sur petit écran). */ startCollapsed?: boolean } = {}) {
  const ref = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [small] = useState(isSmallScreen)
  const [collapsed, setCollapsed] = useState(startCollapsed ?? small)
  const peek = small ? SMALL_PEEK : PEEK_MARGIN
  const [travel, setTravel] = useState(0)
  /** Le contenu dépasse la moitié de l’écran : il défile. */
  const [scrollable, setScrollable] = useState(false)
  const drag = useRef<{ y: number; t: number; from: number; moving: boolean; id: number } | null>(null)
  const moved = useRef(false)

  // Distance de repli : tout le contenu sous les filtres.
  useLayoutEffect(() => {
    const el = ref.current
    const body = bodyRef.current
    if (!el || !body) return
    // Le contenu commence 12 px (gap-3) sous la poignée.
    const measure = () => {
      setTravel(Math.max(0, el.offsetHeight - (body.offsetTop - 12 + peek)))
      setScrollable(body.scrollHeight > body.clientHeight + 1)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    observer.observe(body)
    return () => observer.disconnect()
  }, [peek])

  // Le contenu change (filtres, liste) : relu à chaque affichage, sans boucle (même valeur, pas de nouveau rendu).
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (body) setScrollable(body.scrollHeight > body.clientHeight + 1)
  })

  // Réduit (glissé ou poignée), le panneau montre toujours le haut de son contenu.
  useEffect(() => {
    if (collapsed && bodyRef.current) bodyRef.current.scrollTop = 0
  }, [collapsed])

  const offset = collapsed ? travel : 0
  const place = (y: number, animate: boolean) => {
    if (!ref.current) return
    ref.current.style.transition = animate ? SNAP : 'none'
    ref.current.style.transform = `translateY(${y}px)`
    // Le contenu s’efface à mesure qu’il passe sous la barre d’onglets.
    if (bodyRef.current) {
      bodyRef.current.style.transition = animate ? 'opacity 0.32s' : 'none'
      // Sur petit écran, les premières lignes restent lisibles, panneau réduit.
      bodyRef.current.style.opacity = String(small || !travel ? 1 : Math.min(1, Math.max(0, 1 - y / travel)))
    }
  }

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      // Panneau ouvert dont le contenu défile : le doigt sur le contenu le fait défiler, la poignée glisse le panneau.
      if (scrollable && !collapsed && bodyRef.current?.contains(e.target as Node)) return
      drag.current = { y: e.clientY, t: e.timeStamp, from: offset, moving: false, id: e.pointerId }
      moved.current = false
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const dy = e.clientY - d.y
      if (!d.moving) {
        if (Math.abs(dy) < 6) return
        d.moving = true
        ref.current?.setPointerCapture(e.pointerId)
      }
      // Au-delà des bords, le panneau résiste (un tiers du geste).
      const raw = d.from + dy
      const y = raw < 0 ? raw / 3 : raw > travel ? travel + (raw - travel) / 3 : raw
      place(y, false)
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current
      drag.current = null
      if (!d?.moving) return
      moved.current = true
      const dy = e.clientY - d.y
      const speed = dy / Math.max(1, e.timeStamp - d.t)
      const y = d.from + dy
      const next = speed > 0.4 ? true : speed < -0.4 ? false : y > travel / 2
      setCollapsed(next)
      place(next ? travel : 0, true)
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

  return {
    ref,
    bodyRef,
    collapsed,
    setCollapsed,
    handlers,
    style: { transform: `translateY(${offset}px)`, transition: SNAP },
    small,
    scrollable,
    bodyStyle: { opacity: collapsed && !small ? 0 : 1, transition: 'opacity 0.32s' },
  }
}
