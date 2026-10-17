import { useData } from '../../firebase/store'
import { formatRouteDistance, fromStored, routeFromSaved, type Route } from '../../lib/route'
import { RouteThumb } from './RouteThumb'

/** Le trajet joint à un moment : une balade importée, ou un trajet habituel repris. */
export interface TraceResult {
  route: Route
  /** Garder comme trajet habituel, avec ce nom. */
  keep: string | null
}

/**
 * « Le trajet », dans Noter : reprendre un trajet habituel en un toucher. Plus de saisie à la main (17 octobre) :
 * les balades arrivent par fichier. Facultatif, privé.
 */
export function RouteCard({ value, onChange }: { value: TraceResult | null; onChange: (value: TraceResult | null) => void }) {
  const { routes } = useData()
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
              {route.moments.length ? `${route.moments.length} repère${route.moments.length > 1 ? 's' : ''} sur le trajet` : 'Aucun repère placé'}
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
      {route && (
        <button type="button" onClick={() => onChange(null)} className="btn btn-quiet">
          Retirer le trajet
        </button>
      )}
    </section>
  )
}

export type { Route }
