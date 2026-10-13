import { useEffect, useState } from 'react'
import { buildMealsIcs } from '../../lib/ics'
import { formatTime, type ISODate } from '../../lib/dates'
import { nextMealIndex, portion, sortMeals, type Feeding } from '../../lib/feeding'
import { shareFiles } from '../../lib/share'

function useClock(): string {
  const read = () => new Date().toTimeString().slice(0, 5)
  const [now, setNow] = useState(read)
  useEffect(() => {
    const update = () => setNow(read())
    const timer = setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return now
}

/** Ration du jour, heures des repas, et rappels à installer dans le calendrier de l'iPhone. */
export function Meals({ dogName, feeding, today }: { dogName: string; feeding: Feeding; today: ISODate }) {
  const now = useClock()
  const [message, setMessage] = useState('')
  const meals = sortMeals(feeding.meals)
  const grams = portion(feeding)
  const next = nextMealIndex(meals, now)

  // Une app web ne peut pas programmer de notification sur iPhone : les rappels passent par l'app Calendrier.
  const installReminders = async () => {
    const ics = buildMealsIcs(dogName, meals, grams, today)
    const outcome = await shareFiles([new File([ics], `Repas de ${dogName}.ics`, { type: 'text/calendar' })], `Repas de ${dogName}`)
    setMessage(outcome === 'downloaded' ? 'Fichier téléchargé : ouvre-le pour ajouter les rappels au calendrier.' : '')
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-bold">Repas</h2>
        <span className="text-sm text-muted">
          {feeding.gramsPerDay} g par jour{grams ? ` · ${grams} g par repas` : ''}
        </span>
      </div>
      <div className="card flex flex-col gap-3 p-4">
        <ul className="m-0 grid list-none gap-2 p-0" style={{ gridTemplateColumns: `repeat(${Math.max(1, meals.length)}, minmax(0, 1fr))` }}>
          {meals.map((meal, i) => {
            const isNext = i === next
            return (
              <li key={`${meal.time}-${i}`} className={`flex flex-col items-center gap-0.5 rounded-field px-1 py-2.5 text-center ${isNext ? 'bg-primary-soft' : 'bg-bg'}`}>
                <span className={`font-display text-xl font-bold ${isNext ? 'text-primary-dark' : 'text-text'}`}>{formatTime(meal.time)}</span>
                <span className="text-[13px] text-muted">{meal.label}</span>
                {isNext && <span className="text-[13px] font-semibold text-primary-dark">Prochain</span>}
              </li>
            )
          })}
        </ul>
        <button type="button" onClick={() => void installReminders()} className="h-12 rounded-full border-[1.5px] border-primary bg-surface text-[15px] font-bold text-primary">
          Recevoir les rappels sur l'iPhone
        </button>
        {message && (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
