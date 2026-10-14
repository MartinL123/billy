import { lazy, Suspense, useState } from 'react'
import { useData } from '../../firebase/store'
import type { ISODate } from '../../lib/dates'
import { formatRouteDistance, fromStored, routeFromSaved, type Route } from '../../lib/route'
import type { TraceResult } from './Tracer'
import { RouteThumb } from './RouteThumb'

// La carte (Leaflet) n'est chargée qu'en ouvrant le tracé.
const Tracer = lazy(() => import('./Tracer').then((m) => ({ default: m.Tracer })))

/**
 * « Le trajet », dans Noter (docs/specs/trajets.md § 1) : reprendre un trajet habituel en un toucher, ou en tracer un.
 * Facultatif. Le tracé reste privé (Carnet).
 */
export function RouteCard({ date, value, onChange }: { date: ISODate; value: TraceResult | null; onChange: (value: TraceResult | null) => void }) {
  const { routes } = useData()
  const [tracing, setTracing] = useState(false)
  const route = value?.route

  return (
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">
        Le trajet <span className="font-normal text-muted">(facultatif)</span>
      </h2>
      {route ? (
        <div className="flex items-center gap-3">
          <RouteThumb points={route.points} moments={route.moments} size={72} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[17px] font-bold">{formatRouteDistance(route.distanceM)}</span>
            <span className="text-sm text-muted">
              {route.moments.length ? `${route.moments.length} moment${route.moments.length > 1 ? 's' : ''} sur le trajet` : 'Aucun moment placé'}
              {value?.keep ? ` · gardé : ${value.keep}` : ''}
              {!value?.keep && route.savedRouteId ? ` · ${routes.find((r) => r.id === route.savedRouteId)?.name ?? 'trajet habituel'}` : ''}
            </span>
          </span>
        </div>
      ) : (
        routes.length > 0 && (
          <>
            <p className="text-[15px] font-semibold text-muted">Vos trajets habituels</p>
            <div className="scroll-row -mx-4 flex gap-2.5 px-4 pb-1">
              {routes.map((saved) => (
                <button key={saved.id} type="button" onClick={() => onChange({ route: routeFromSaved(saved.id, { ...saved, points: fromStored(saved.points) }), keep: null })} className="flex w-[116px] shrink-0 flex-col items-start gap-1 rounded-[16px] border-2 border-solid border-border bg-surface p-2 text-left">
                  <RouteThumb points={fromStored(saved.points)} size={96} />
                  <span className="line-clamp-2 w-full text-[15px] leading-tight font-bold">{saved.name}</span>
                  <span className="text-sm text-muted">{formatRouteDistance(saved.distanceM)}</span>
                </button>
              ))}
            </div>
          </>
        )
      )}
      <div className={route ? 'grid grid-cols-2 gap-2' : ''}>
        <button type="button" onClick={() => setTracing(true)} className="btn w-full border-2 border-solid border-[#9A4413] bg-surface text-[#9A4413]">
          {route ? 'Modifier' : 'Tracer un nouveau trajet'}
        </button>
        {route && (
          <button type="button" onClick={() => onChange(null)} className="btn btn-quiet">
            Retirer
          </button>
        )}
      </div>
      {tracing && (
        <Suspense fallback={null}>
          <Tracer
            date={date}
            initial={route}
            onCancel={() => setTracing(false)}
            onDone={(result: TraceResult) => {
              setTracing(false)
              onChange(result)
            }}
          />
        </Suspense>
      )}
    </section>
  )
}

export type { Route }
