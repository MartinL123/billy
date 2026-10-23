import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { nearestSnap, sheetPositions, type Snap } from '../../lib/sheetSnap'
import { moveList, movePanel, releaseSpeed, sheetGesture, TAP_SLOP, type GestureOwner } from '../../lib/sheetGesture'
import { haptic } from '../../native/flair'

// Le panneau glissant du bas de la carte : celui des balades et celui d’une balade mise en avant (même geste partout).
// R-077 : trois crans comme dans Plans. Réduit (poignée et titre), moitié (à l’ouverture), haut (juste sous les
// boutons de la carte). Hors du cran haut, glisser n’importe où déplace le panneau ; au cran haut, la liste défile, et
// tout en haut de la liste, tirer vers le bas fait redescendre le panneau (R-099 : dans le même geste, voir plus bas).
// R-091, R-082 : au cran du milieu, les premières actions (ou la première rangée de balades) sont entières au-dessus de
// l’action fixée en bas ou du rond Accueil (règle : sheetPositions).

/** Le rond Accueil dépasse de 26 px de la barre d’onglets : sans action fixée en bas, le panneau garde 36 px dessous. */
export const HOME_CLEARANCE = 36

export type { Snap }

const SNAP_EASE = 'transform 0.34s cubic-bezier(0.3, 1.15, 0.5, 1)'

export function useSheet({ start = 'half', peekRef, halfRef, bottomInset = 0, peekInset, peekGap }: { start?: Snap; /** Le bas de cet élément borne la partie visible réduit (sinon : le haut du contenu). */ peekRef?: RefObject<HTMLElement | null>; /** Le bas de cet élément est visible au cran du milieu (les premières actions, la première rangée). */ halfRef?: RefObject<HTMLElement | null>; /** Hauteur couverte en bas par une barre fixe (l’action principale) ou le rond Accueil. */ bottomInset?: number; /** Réduit : ce qui couvre le bas (par défaut `bottomInset`) et l’air au-dessus (T-097). */ peekInset?: number; peekGap?: number } = {}) {
  const ref = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [snap, setSnap] = useState<Snap>(start)
  const [positions, setPositions] = useState<Record<Snap, number>>({ full: 0, half: 0, collapsed: 0 })
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
        ...(peekInset !== undefined ? { peekInset } : {}),
        ...(peekGap !== undefined ? { peekGap } : {}),
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
  }, [peekRef, halfRef, bottomInset, peekInset, peekGap])

  // Hors du cran haut, la liste revient en haut.
  useEffect(() => {
    if (snap !== 'full' && bodyRef.current) bodyRef.current.scrollTop = 0
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

  // R-094 : le contenu change (journal, fiche, relecture) pendant qu’un cran est demandé : le panneau rejoint la
  // position recalculée de son cran (le style de React ne le ferait pas si la valeur n’a pas changé entre deux rendus).
  useLayoutEffect(() => {
    place(positions[snap], true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, snap])

  const settle = (next: Snap) => {
    setSnap(next)
    place(positions[next], true)
  }
  // Le lâcher d’un glissé : le cran le plus proche, ou le suivant si le geste est vif ; R-080 : un léger « clic »
  // quand le panneau s’arrête sur un autre cran.
  const release = (y: number, speed: number) => {
    const next = nearestSnap(positions, y, speed)
    if (next !== snap) haptic('selection')
    settle(next)
  }

  // Les gestes au doigt (R-099) sont écoutés hors de React (ses `onTouchMove` ne peuvent pas empêcher le défilement) :
  // ils lisent l’état du panneau ici.
  const live = useRef({ snap, positions, release, place })
  live.current = { snap, positions, release, place }

  // R-099 : au doigt, le panneau et sa liste se partagent le geste, mouvement par mouvement (règle : sheetGesture).
  // - Hors du cran haut, le panneau suit le doigt (le défilement est empêché) ; arrivé en haut, le doigt qui monte
  //   encore fait défiler la liste : le défilement natif ne pouvant plus démarrer dans ce geste, la liste défile à la
  //   main, avec son élan au lâcher.
  // - Au cran haut, la liste défile d’elle-même (élan d’iOS) ; tout en haut de la liste, le doigt qui descend fait
  //   descendre le panneau, sans être levé.
  // La souris (le site sur ordinateur) garde les évènements « pointer » plus bas.
  useEffect(() => {
    const el = ref.current
    const body = bodyRef.current
    if (!el || !body) return
    type Gesture = {
      id: number
      x0: number
      y0: number
      last: number
      /** Position du panneau, sans (raw) et avec (y) la résistance sous le cran réduit. */
      raw: number
      y: number
      owner: GestureOwner | null
      /** Le défilement a été empêché dans ce geste : la liste ne peut plus défiler d’elle-même. */
      held: boolean
      panelMoved: boolean
      inBody: boolean
      samples: { y: number; t: number }[]
    }
    let g: Gesture | null = null
    let glide = 0
    const stopGlide = () => {
      cancelAnimationFrame(glide)
      glide = 0
    }
    const maxScroll = () => Math.max(0, body.scrollHeight - body.clientHeight)
    // L’élan de la liste défilée à la main : comme iOS, la vitesse décroît d’elle-même.
    const glideFrom = (speed: number) => {
      let v = speed
      let t = performance.now()
      const frame = (now: number) => {
        const dt = Math.min(32, now - t)
        t = now
        const before = body.scrollTop
        body.scrollTop = Math.max(0, Math.min(maxScroll(), before - v * dt))
        v *= Math.pow(0.997, dt)
        glide = Math.abs(v) > 0.02 && body.scrollTop !== before ? requestAnimationFrame(frame) : 0
      }
      glide = requestAnimationFrame(frame)
    }
    const find = (list: TouchList, id: number) => Array.from(list).find((t) => t.identifier === id)

    const onStart = (e: TouchEvent) => {
      stopGlide()
      moved.current = false
      const t = e.changedTouches[0]
      // Deux doigts : le geste en cours s’arrête là (le panneau revient à son cran).
      if (!t || e.touches.length > 1) {
        if (g?.panelMoved) live.current.place(live.current.positions[live.current.snap], true)
        g = null
        return
      }
      // Pendant l’animation d’un cran, le panneau repart d’où il est vraiment.
      const transform = getComputedStyle(el).transform
      const y = transform && transform !== 'none' ? new DOMMatrix(transform).m42 : live.current.positions[live.current.snap]
      g = { id: t.identifier, x0: t.clientX, y0: t.clientY, last: t.clientY, raw: y, y, owner: null, held: false, panelMoved: false, inBody: body.contains(e.target as Node), samples: [{ y: t.clientY, t: e.timeStamp }] }
    }

    const onMove = (e: TouchEvent) => {
      if (!g) return
      const t = find(e.changedTouches, g.id)
      if (!t) return
      const first = g.owner === null
      // Avant la décision, rien n’a bougé : le premier mouvement compte depuis le début du geste.
      const step = first ? t.clientY - g.y0 : t.clientY - g.last
      g.last = t.clientY
      g.samples.push({ y: t.clientY, t: e.timeStamp })
      if (g.samples.length > 12) g.samples.shift()
      const scrollTop = g.inBody || g.held ? body.scrollTop : 0
      const owner = sheetGesture({ owner: g.owner, y: g.y, scrollTop, dx: t.clientX - g.x0, dy: t.clientY - g.y0, step })
      g.owner = owner
      if (owner === null || owner === 'none') return
      moved.current = true
      const hold = () => {
        if (!e.cancelable) return
        e.preventDefault()
        if (g) g.held = true
      }
      const movePanelBy = (dy: number) => {
        if (!g) return
        const r = movePanel(g.raw, dy, live.current.positions.collapsed)
        g.raw = r.raw
        g.y = r.y
        g.panelMoved = true
        live.current.place(r.y, false)
        // Arrivé au cran haut : le reste du mouvement fait défiler la liste (à la main).
        if (r.rest < 0) {
          body.scrollTop = moveList(body.scrollTop, r.rest, maxScroll()).scrollTop
          g.owner = 'list'
        }
      }
      if (owner === 'panel') {
        hold()
        movePanelBy(step)
        return
      }
      // La liste : d’elle-même si le défilement n’a jamais été empêché dans ce geste, sinon à la main.
      if (!g.held) return
      hold()
      const r = moveList(body.scrollTop, step, maxScroll())
      body.scrollTop = r.scrollTop
      if (r.rest > 0) {
        g.owner = 'panel'
        movePanelBy(r.rest)
      }
    }

    const onEnd = (e: TouchEvent) => {
      if (!g || !find(e.changedTouches, g.id)) return
      const done = g
      g = null
      if (done.owner === null || done.owner === 'none') return
      // Un glissé n’ouvre pas la carte ni le bouton touchés (WebKit ne crée pas de « click » après ce refus).
      if (e.cancelable) e.preventDefault()
      const speed = releaseSpeed(done.samples)
      if (done.panelMoved) live.current.release(done.y, speed)
      if (done.owner === 'list' && done.held) glideFrom(speed)
    }

    const onCancel = (e: TouchEvent) => {
      if (!g || !find(e.changedTouches, g.id)) return
      if (g.panelMoved) live.current.place(live.current.positions[live.current.snap], true)
      g = null
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: false })
    el.addEventListener('touchcancel', onCancel)
    return () => {
      stopGlide()
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onCancel)
    }
  }, [])

  // La souris (le site sur ordinateur) : glisser le panneau ; au cran haut, la liste défile à la molette.
  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      // Le doigt passe par les évènements « touch » ci-dessus.
      if (e.pointerType === 'touch' || e.button !== 0) return
      moved.current = false
      const inBody = Boolean(bodyRef.current?.contains(e.target as Node))
      // Au cran haut, le pointeur dans une liste défilée la laisse défiler.
      if (snap === 'full' && inBody && (bodyRef.current?.scrollTop ?? 0) > 0) return
      const { pointerId: id, clientY: y0, timeStamp: t0 } = e
      const from = offset
      let moving = false
      // La souris est suivie sur toute la page : un geste rapide quitte le panneau avant d’être reconnu comme glissé.
      // (Pas de capture du pointeur dès l’appui : le « click » d’un simple appui irait au panneau, pas à la carte.)
      const onMove = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== id) return
        const dy = ev.clientY - y0
        if (!moving) {
          if (Math.abs(dy) < TAP_SLOP) return
          // Au cran haut, monter dans la liste la fait défiler : le panneau ne bouge pas.
          if (snap === 'full' && inBody && dy < 0) return stop()
          moving = true
        }
        // Au-delà des bords, le panneau résiste (un tiers du geste).
        const raw = from + dy
        const max = positions.collapsed
        place(raw < 0 ? raw / 3 : raw > max ? max + (raw - max) / 3 : raw, false)
      }
      const onUp = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== id) return
        stop()
        if (!moving) return
        moved.current = true
        const dy = ev.clientY - y0
        release(from + dy, dy / Math.max(1, ev.timeStamp - t0))
      }
      const onCancel = () => {
        stop()
        if (moving) place(offset, true)
      }
      const stop = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
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
    /** La position du panneau à son cran (translateY, px) : la carte se cadre au-dessus. */
    offset,
    setSnap: settle,
    cycle,
    collapsed: snap === 'collapsed',
    handlers,
    style: { transform: `translateY(${offset}px)`, transition: SNAP_EASE },
    handleLabel: snap === 'collapsed' ? 'Afficher le panneau' : snap === 'half' ? 'Agrandir le panneau' : 'Réduire le panneau',
  }
}
