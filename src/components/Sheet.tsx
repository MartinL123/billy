import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DangerButton } from './Buttons'

/** Hauteur masquée par le clavier iOS, pour garder la feuille au-dessus. */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop))
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}

interface SheetProps {
  label: string
  onClose: () => void
  children: ReactNode
}

/** Au-delà de ce glissé vers le bas (px), ou plus vite que ce seuil (px/ms), la feuille se ferme. */
const CLOSE_DISTANCE = 100
const CLOSE_SPEED = 0.5

/**
 * Feuille qui glisse depuis le bas : poignée, tap sur le fond pour fermer, glisser la poignée vers le bas pour fermer
 * (R-058). À l’ouverture, le focus entre dans la feuille et l’écran du dessous devient inerte (VoiceOver, clavier) ;
 * à la fermeture, il revient au bouton qui l’a ouverte.
 */
export function Sheet({ label, onClose, children }: SheetProps) {
  const keyboard = useKeyboardInset()
  const dialog = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const [drag, setDrag] = useState(0)
  const start = useRef<{ y: number; t: number } | null>(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Le focus : dans la feuille (sauf si un champ l’a déjà pris), l’app derrière en inert, puis retour au déclencheur.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const root = document.getElementById('root')
    if (root) root.inert = true
    if (!dialog.current?.contains(document.activeElement)) dialog.current?.focus({ preventScroll: true })
    return () => {
      if (root) root.inert = false
      opener?.focus?.({ preventScroll: true })
    }
  }, [])

  const onDown = (e: PointerEvent<HTMLElement>) => {
    start.current = { y: e.clientY, t: e.timeStamp }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (start.current) setDrag(Math.max(0, e.clientY - start.current.y))
  }
  const onUp = (e: PointerEvent<HTMLElement>) => {
    const from = start.current
    start.current = null
    if (!from) return
    const dy = e.clientY - from.y
    const speed = dy / Math.max(1, e.timeStamp - from.t)
    if (dy > CLOSE_DISTANCE || (dy > 10 && speed > CLOSE_SPEED)) close.current()
    else setDrag(0)
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Fermer" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade border-0 bg-[rgba(24,32,30,0.35)]" />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ bottom: keyboard, transform: drag ? `translateY(${drag}px)` : undefined, transition: drag || start.current ? 'none' : undefined }}
        className="absolute inset-x-0 flex max-h-[92dvh] animate-sheet flex-col gap-3 overflow-y-auto rounded-t-panel bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] outline-none transition-transform duration-200"
      >
        {/* La poignée : on la tire vers le bas pour fermer, ou on la touche (VoiceOver : « Fermer »). */}
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => !drag && onClose()}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            start.current = null
            setDrag(0)
          }}
          className="-mx-5 -mb-2 flex min-h-11 shrink-0 touch-none items-center justify-center border-0 bg-transparent"
        >
          <span className="h-[5px] w-10 rounded-full bg-line-strong" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  title: string
  message?: string
  confirmLabel: string
  /** `danger` (défaut) pour une action destructrice, `primary` pour une simple confirmation. */
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmation avant une action destructrice ou la déconnexion. */
export function ConfirmSheet({ title, message, confirmLabel, tone = 'danger', onConfirm, onCancel }: ConfirmProps) {
  return (
    <Sheet label={title} onClose={onCancel}>
      <h2 className="title-section mt-1">{title}</h2>
      {message && <p className="text-[0.8824rem] leading-snug text-muted">{message}</p>}
      {/* T-106 : une suppression reste un tertiary rouge (poubelle pour « Supprimer… ») ; une simple confirmation, vert plein. */}
      {tone === 'danger' ? (
        <DangerButton icon={/^Supprimer/.test(confirmLabel) ? 'trash' : 'none'} onClick={onConfirm} className="mt-2">
          {confirmLabel}
        </DangerButton>
      ) : (
        <button type="button" onClick={onConfirm} className="btn btn-primary mt-2">
          {confirmLabel}
        </button>
      )}
      <button type="button" onClick={onCancel} className="btn-text self-center px-4">
        Annuler
      </button>
    </Sheet>
  )
}
