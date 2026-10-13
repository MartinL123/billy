import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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

/** Feuille qui glisse depuis le bas : poignée, tap sur le fond pour fermer. */
export function Sheet({ label, onClose, children }: SheetProps) {
  const keyboard = useKeyboardInset()

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 animate-fade border-0 bg-[rgba(24,32,30,0.35)]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ bottom: keyboard }}
        className="absolute inset-x-0 flex max-h-[92dvh] animate-sheet flex-col gap-3 overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)]"
      >
        <div className="h-[5px] w-10 shrink-0 self-center rounded-full bg-border" />
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
      <h2 className="mt-1 font-display text-2xl font-bold">{title}</h2>
      {message && <p className="text-[15px] leading-snug text-muted">{message}</p>}
      <button type="button" onClick={onConfirm} className={`mt-2 h-[54px] rounded-full border-0 text-[17px] font-bold text-white ${tone === 'danger' ? 'bg-danger' : 'bg-primary'}`}>
        {confirmLabel}
      </button>
      <button type="button" onClick={onCancel} className="btn btn-quiet">
        Annuler
      </button>
    </Sheet>
  )
}
