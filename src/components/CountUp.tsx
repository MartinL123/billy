import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Un nombre qui défile jusqu’à sa valeur (900 ms) quand il change (T-033) : os, km, % découvert.
 * `fromZero` : il part de 0 à l’affichage (arrivée sur l’accueil). « Réduire les animations » : la valeur tout de suite.
 */
export function CountUp({ value, format = (n) => String(Math.round(n)), fromZero = false, duration = 900 }: { value: number; format?: (n: number) => string; fromZero?: boolean; duration?: number }) {
  const [shown, setShown] = useState(() => (fromZero && !reduced() ? 0 : value))
  const current = useRef(shown)
  useEffect(() => {
    const from = current.current
    if (from === value || reduced()) {
      current.current = value
      setShown(value)
      return
    }
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const next = from + (value - from) * (1 - Math.pow(1 - p, 3))
      current.current = next
      setShown(next)
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [value, duration])
  return <>{format(shown)}</>
}
