import { useEffect, useState } from 'react'
import { todayISO, type ISODate } from './dates'

/** Date du jour, remise à jour quand l’app revient au premier plan (elle peut rester ouverte des jours). */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO())
  useEffect(() => {
    const update = () => setToday(todayISO())
    document.addEventListener('visibilitychange', update)
    const timer = setInterval(update, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', update)
      clearInterval(timer)
    }
  }, [])
  return today
}
