import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { BoneIcon } from './BoneIcon'
import { BoneShower } from './BoneShower'

interface Toast {
  id: number
  text: ReactNode
  action?: { label: string; run: () => void }
  /** Des os gagnés (T-033) : le bandeau tombe du haut et un os vole jusqu’au compteur d’os, qui rebondit. */
  bones?: boolean
  /** Fin de mission : une gerbe d’os en plus. */
  shower?: boolean
}

type Show = (text: ReactNode, action?: Toast['action'], options?: { bones?: boolean; shower?: boolean }) => void

const ToastContext = createContext<Show>(() => undefined)

export const useToast = () => useContext(ToastContext)

/** Le compteur d’os de l’écran (s’il y en a un) porte cet attribut. */
export const BONES_COUNTER = 'data-bones-counter'

/** L’os qui vole du bandeau jusqu’au compteur d’os, puis fait rebondir le compteur. */
function FlyingBone({ from }: { from: HTMLElement | null }) {
  const [path, setPath] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)
  useLayoutEffect(() => {
    const counter = document.querySelector<HTMLElement>(`[${BONES_COUNTER}]`)
    if (!from || !counter || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const a = from.getBoundingClientRect()
    const b = counter.getBoundingClientRect()
    setPath({ x: a.left, y: a.top, dx: b.left + b.width / 2 - (a.left + a.width / 2), dy: b.top + b.height / 2 - (a.top + a.height / 2) })
  }, [from])
  if (!path) return null
  const bump = () => {
    const counter = document.querySelector<HTMLElement>(`[${BONES_COUNTER}]`)
    if (!counter) return
    counter.classList.remove('bump')
    void counter.offsetWidth
    counter.classList.add('bump')
  }
  return (
    <span aria-hidden="true" onAnimationEnd={bump} className="bone-fly pointer-events-none fixed z-50" style={{ left: path.x, top: path.y, ['--dx' as string]: `${path.dx}px`, ['--dy' as string]: `${path.dy}px` }}>
      <BoneIcon size={22} />
    </span>
  )
}

/** R-064 : durée d’affichage d’un toast, sans action et avec une action. */
export const TOAST_MS = 5000
export const TOAST_ACTION_MS = 10_000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const show = useCallback<Show>((text, action, options) => setToast({ id: Date.now(), text, action, ...(options?.bones ? { bones: true } : {}), ...(options?.shower ? { shower: true } : {}) }), [])
  const banner = useRef<HTMLDivElement>(null)
  const [bannerEl, setBannerEl] = useState<HTMLElement | null>(null)

  // R-064 : un toast avec une action (« Annuler ») reste 10 s, et le temps s’arrête tant qu’on le touche ou qu’il a le
  // focus (VoiceOver, clavier) ; sans action, 5 s.
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (!toast || held) return
    const timer = setTimeout(() => setToast(null), toast.action ? TOAST_ACTION_MS : TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast, held])
  useEffect(() => setHeld(false), [toast])
  useEffect(() => setBannerEl(toast?.bones ? banner.current : null), [toast])

  const body = toast && (
    <div
      ref={banner}
      key={toast.id}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className={`pointer-events-auto flex min-h-12 max-w-full items-center gap-2 rounded-2xl bg-text py-1 pr-1 pl-4 text-[0.8824rem] text-white shadow-lg ${toast.bones ? 'toast-drop' : 'animate-fade'}`}>
      <span className="py-2">{toast.text}</span>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.run()
            setToast(null)
          }}
          className="min-h-12 shrink-0 rounded-full border-2 border-solid border-white/70 bg-transparent px-4 text-[1rem] font-bold text-white"
        >
          {toast.action.label}
        </button>
      ) : (
        <span className="w-3" />
      )}
    </div>
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Les os gagnés arrivent en haut, le reste en bas (au-dessus de la barre d’onglets). */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] z-40 flex justify-center">
        {toast?.bones && body}
      </div>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+112px)] z-40 flex justify-center">
        {toast && !toast.bones && body}
      </div>
      {toast?.bones && bannerEl && <FlyingBone key={toast.id} from={bannerEl} />}
      {toast?.shower && <BoneShower key={`gerbe-${toast.id}`} />}
    </ToastContext.Provider>
  )
}
