import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  text: ReactNode
  action?: { label: string; run: () => void }
}

const ToastContext = createContext<(text: ReactNode, action?: Toast['action']) => void>(() => undefined)

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const show = useCallback((text: ReactNode, action?: Toast['action']) => setToast({ id: Date.now(), text, action }), [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+112px)] z-40 flex justify-center">
        {toast && (
          <div key={toast.id} className="pointer-events-auto flex min-h-12 max-w-full animate-fade items-center gap-2 rounded-2xl bg-text py-1 pr-1 pl-4 text-[15px] text-white shadow-lg">
            <span className="py-2">{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run()
                  setToast(null)
                }}
                className="min-h-12 shrink-0 rounded-full border-2 border-solid border-white/70 bg-transparent px-4 text-[17px] font-bold text-white"
              >
                {toast.action.label}
              </button>
            ) : (
              <span className="w-3" />
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
