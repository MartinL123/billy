import { useEffect, useState } from 'react'

/** Hors ligne (V5, maquette V5-Etat-HorsLigne) : un bandeau calme, en bleu information, jamais en rouge. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  if (!offline) return null
  return (
    <div role="status" className="anim-in mx-4 mb-3 flex items-center gap-3 rounded-field bg-[#E3EAF8] px-3.5 py-3 text-[#1D4685]">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3-1.6A4.5 4.5 0 0 0 7 18z" />
        <path d="M4 4l16 16" />
      </svg>
      <span className="text-[0.8824rem] font-semibold">
        <b>Pas de réseau.</b> Tout ce que vous notez est gardé et partira tout seul.
      </span>
    </div>
  )
}
