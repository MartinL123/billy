import { useId, useState, type ReactNode } from 'react'
import { Stats } from '../../components/Stats'
import type { Route } from '../../lib/route'
import { altitudeProfile, DAYLIGHT_LABELS, rainText, sheetFigures, sheetSplits, streetsSummary, type RoutePlace, type RouteStreet } from '../../lib/walkFacts'
import { averageKmh, hrSummary, kmhText, splitLabel, splitTime } from '../../lib/walkSheet'
import { PaceChart } from './PaceChart'

// T-102 (V6.1 § 7) : les blocs de la fiche, tous visibles (plus de « Tous les chiffres » replié). Chaque bloc ne
// s’affiche que s’il a des données ; une liste longue montre ses 5 premières lignes et « Voir tout ».

/** Au-delà de 5 lignes : les 5 premières, puis « Voir tout ». */
export const LIST_PREVIEW = 5

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="title-section">{title}</h2>
      <div className="card flex flex-col gap-3.5 p-4">{children}</div>
    </section>
  )
}

/** Une liste qui montre ses 5 premières lignes, puis « Voir tout (12) » pour le reste. */
function ShortList<T>({ items, render, label }: { items: T[]; render: (item: T, i: number) => ReactNode; label: string }) {
  const [all, setAll] = useState(false)
  const id = useId()
  const shown = all ? items : items.slice(0, LIST_PREVIEW)
  return (
    <>
      <ul id={id} aria-label={label} className="m-0 flex list-none flex-col p-0">
        {shown.map((item, i) => (
          <li key={i} className="flex min-h-11 items-center gap-2 border-b border-divider py-1.5 text-[1rem] leading-snug last:border-b-0">
            {render(item, i)}
          </li>
        ))}
      </ul>
      {items.length > LIST_PREVIEW && (
        <button type="button" aria-expanded={all} aria-controls={id} onClick={() => setAll(!all)} className="btn-text -my-1 -ml-1 self-start">
          {all ? 'Voir moins' : `Voir tout (${items.length})`}
        </button>
      )}
    </>
  )
}

/** 4. L’allure : la courbe minute par minute (glissable), vitesse moyenne en marche, vitesse max, km par km. */
export function PaceBlock({ route, onScrub }: { route: Route; onScrub: (at: { lat: number; lng: number } | undefined) => void }) {
  const avg = averageKmh(route)
  const { maxSpeed } = sheetFigures(route)
  const splits = sheetSplits(route)
  const showCurve = Boolean(route.track && route.pace && route.pace.length > 1)
  const rows: { value: string; label: string }[][] = []
  for (let i = 0; i < splits.length; i += 4) rows.push(splits.slice(i, i + 4).map((s) => ({ value: splitTime(s.seconds), label: splitLabel(s) })))
  if (!showCurve && !avg && !maxSpeed && !rows.length) return null
  return (
    <Block title="Allure">
      {showCurve && <PaceChart route={route} onScrub={onScrub} />}
      <Stats items={[{ value: avg ? kmhText(avg) : '', label: route.track && route.stops ? 'Moyenne en marche' : 'Vitesse moyenne' }, { value: maxSpeed ? kmhText(maxSpeed) : '', label: 'Vitesse max' }]} />
      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="title-card">Km par km</h3>
          {rows.slice(0, LIST_PREVIEW).map((row, i) => (
            <Stats key={i} items={row} />
          ))}
        </div>
      )}
    </Block>
  )
}

/** 6. Le parcours : les rues dans l’ordre (nouvelles en gras), les parcs et lieux, le même trajet déjà fait. */
export function RouteBlock({ streets, places, again }: { streets: RouteStreet[]; places: RoutePlace[]; again?: string }) {
  if (!streets.length && !places.length && !again) return null
  return (
    <Block title="Le parcours">
      {again && <p className="m-0 text-[1rem] leading-snug font-semibold">{again}</p>}
      {streets.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="title-card">{streetsSummary(streets)}</h3>
          <ShortList
            items={streets}
            label="Rues traversées, dans l’ordre"
            render={(s) =>
              s.new ? (
                <>
                  <span className="min-w-0 font-bold">{s.name}</span>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[0.7647rem] font-bold text-primary">nouvelle</span>
                </>
              ) : (
                <span className="min-w-0">{s.name}</span>
              )
            }
          />
        </div>
      )}
      {places.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="title-card">{places.length > 1 ? 'Parcs et lieux traversés' : 'Lieu traversé'}</h3>
          <ShortList items={places} label="Parcs et lieux traversés" render={(p) => <span className="min-w-0">{p.name}</span>} />
        </div>
      )}
    </Block>
  )
}

/** Une petite courbe (cœur, altitude) : valeurs régulières, échelle d’au moins `minSpan`. */
function Curve({ values, color, minSpan, fill = false }: { values: number[]; color: string; minSpan: number; fill?: boolean }) {
  const min = Math.min(...values)
  const span = Math.max(minSpan, Math.max(...values) - min)
  const pts = values.map((v, i) => `${((i / Math.max(1, values.length - 1)) * 100).toFixed(1)} ${(36 - ((v - min) / span) * 32).toFixed(1)}`)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p}`).join(' ')
  return (
    <svg width="100%" height="48" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" className="block">
      {fill && <path d={`${line} L100 40 L0 40 Z`} fill={color} opacity="0.16" />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

/** 7. Le relief : montée, descente, profil d’altitude (si le trajet a l’altitude). */
export function ReliefBlock({ route }: { route: Route }) {
  const profile = altitudeProfile(route.track?.alt)
  if (route.ascentM === undefined && route.descentM === undefined && !profile) return null
  return (
    <Block title="Le relief">
      <Stats items={[{ value: route.ascentM !== undefined ? `${route.ascentM} m` : '', label: 'Montée' }, { value: route.descentM !== undefined ? `${route.descentM} m` : '', label: 'Descente' }]} />
      {profile && (
        <div className="flex flex-col gap-1">
          <Curve values={profile.values} color="#1E5A50" minSpan={10} fill />
          <p className="source-note">Altitude de {Math.round(profile.min)} à {Math.round(profile.max)}&nbsp;m</p>
        </div>
      )}
    </Block>
  )
}

/** 8. Votre corps : cœur moyen et maximum avec sa courbe, pas, cadence, énergie. Privé, jamais partagé. */
export function BodyBlock({ route, healthSource }: { route: Route; healthSource?: string }) {
  const hr = hrSummary(route.hr)
  const { cadence } = sheetFigures(route)
  const moves = [
    { value: route.steps ? route.steps.toLocaleString('fr-FR') : '', label: 'Pas' },
    { value: cadence ? `${cadence} pas/min` : '', label: 'Cadence en marche' },
    { value: route.energyKcal ? `${route.energyKcal} kcal` : '', label: 'Énergie' },
  ]
  if (!hr && !moves.some((m) => m.value)) return null
  return (
    <Block title="Votre corps">
      {hr && route.hr && (
        <div className="flex flex-col gap-2">
          <Stats items={[{ value: `${hr.avg} bpm`, label: 'Cœur moyen' }, { value: `${hr.max} bpm`, label: 'Cœur maximum' }]} />
          {route.hr.length > 1 && <Curve values={route.hr} color="#C4423A" minSpan={10} />}
        </div>
      )}
      <Stats items={moves} />
      <p className="source-note">{healthSource ?? 'Apple Watch'} · privé, jamais partagé</p>
    </Block>
  )
}

/** 9. La météo : température, ressenti, vent, humidité, pluie, et le moment de la journée. */
export function WeatherBlock({ weather }: { weather: Route['weather'] }) {
  if (!weather) return null
  const deg = (c: number) => `${Math.round(c)} °C`
  return (
    <Block title="La météo">
      {weather.daylight && <p className="m-0 text-[1rem] leading-snug font-semibold">{DAYLIGHT_LABELS[weather.daylight]}</p>}
      <Stats items={[{ value: deg(weather.tempC), label: 'Température' }, { value: weather.feelsC !== undefined ? deg(weather.feelsC) : '', label: 'Ressenti' }, { value: weather.windKmh !== undefined ? `${weather.windKmh} km/h` : '', label: 'Vent' }]} />
      <Stats items={[{ value: weather.humidity !== undefined ? `${weather.humidity} %` : '', label: 'Humidité' }, { value: weather.rainMm !== undefined ? rainText(weather.rainMm) : '', label: 'Pluie' }]} />
    </Block>
  )
}
