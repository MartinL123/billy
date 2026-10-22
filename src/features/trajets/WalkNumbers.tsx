import { useId, useState } from 'react'
import { Stats } from '../../components/Stats'
import { ChevronRightIcon } from '../../components/Icons'
import type { Route } from '../../lib/route'
import { averageKmh, hrSummary, kmhText, kmSplits, sourceLabels, splitLabel, splitTime, weatherText } from '../../lib/walkSheet'

/** La petite courbe du cœur (une valeur par minute). */
function HeartCurve({ hr }: { hr: number[] }) {
  const min = Math.min(...hr)
  const max = Math.max(...hr)
  const span = Math.max(10, max - min)
  const path = hr.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, hr.length - 1)) * 100).toFixed(1)} ${(36 - ((v - min) / span) * 32).toFixed(1)}`).join(' ')
  return (
    <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" className="block">
      <path d={path} fill="none" stroke="#C4423A" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

/** Ce qu’il y a dans « Tous les chiffres » : vide si la balade n’a rien de plus que ses Stats. */
export function hasNumbers(route: Route): boolean {
  return Boolean(averageKmh(route) || route.track || route.steps || route.ascentM !== undefined || route.energyKcal || route.hr?.length || route.weather)
}

/**
 * « Tous les chiffres » (V6 § 6.1), replié : allure moyenne, km par km, pas, montée et descente, énergie, cœur moyen et
 * maximum avec sa petite courbe, météo. Chaque groupe dit d’où il vient (12 px). Jamais de record ni de comparaison.
 */
export function WalkNumbers({ route }: { route: Route }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const avg = averageKmh(route)
  const splits = route.track ? kmSplits(route.track) : []
  const hr = hrSummary(route.hr)
  const src = sourceLabels(route)
  const weather = weatherText(route.weather)
  const rows: { value: string; label: string }[][] = []
  for (let i = 0; i < splits.length; i += 4) rows.push(splits.slice(i, i + 4).map((s) => ({ value: splitTime(s.seconds), label: splitLabel(s) })))
  const body = [
    { value: avg ? kmhText(avg) : '', label: 'Allure moyenne' },
    { value: route.steps ? route.steps.toLocaleString('fr-FR') : '', label: 'Pas' },
    { value: route.ascentM !== undefined ? `${route.ascentM} m` : '', label: 'Montée' },
    { value: route.descentM !== undefined ? `${route.descentM} m` : '', label: 'Descente' },
    { value: route.energyKcal ? `${route.energyKcal} kcal` : '', label: 'Énergie' },
  ]
  return (
    <section className="flex flex-col">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="-mx-1 flex min-h-11 items-center justify-between gap-2 border-0 bg-transparent px-1 text-left text-text">
        <h2 className="title-section">Tous les chiffres</h2>
        <ChevronRightIcon size={22} className={`shrink-0 text-muted transition-transform duration-250 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div id={id} className="card mt-2 flex flex-col gap-3.5 p-4">
          <Stats items={body} />
          {(route.steps || route.energyKcal) && src.health ? <p className="source-note -mt-2">Pas et énergie : {src.health}</p> : null}
          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="title-card">Km par km</h3>
              {rows.map((row, i) => (
                <Stats key={i} items={row} />
              ))}
            </div>
          )}
          {hr && route.hr && (
            <div className="flex flex-col gap-2">
              <h3 className="title-card">Votre cœur</h3>
              <Stats items={[{ value: `${hr.avg} bpm`, label: 'Moyen' }, { value: `${hr.max} bpm`, label: 'Maximum' }]} />
              <HeartCurve hr={route.hr} />
              <p className="source-note">{src.health ?? 'Apple Watch'} · privé, jamais partagé</p>
            </div>
          )}
          {weather && route.weather && (
            <div className="flex flex-col gap-2">
              <h3 className="title-card">Météo au départ</h3>
              <Stats items={[{ value: `${Math.round(route.weather.tempC)} °C`, label: 'Température' }, { value: route.weather.humidity !== undefined ? `${route.weather.humidity} %` : '', label: 'Humidité' }]} />
              {src.weather && <p className="source-note">{src.weather}</p>}
            </div>
          )}
          {src.track && <p className="source-note">Allure et distance : {src.track.replace(/^./, (c) => c.toLocaleLowerCase('fr'))}</p>}
        </div>
      )}
    </section>
  )
}
