import { formatRouteDistance, type Route } from '../../lib/route'
import { RouteThumb } from './RouteThumb'


/** La balade importée jointe au moment, dans Noter. Les balades arrivent par fichier (17 octobre). */
export function RouteCard({ route, onChange }: { route: Route | null; onChange: (route: Route | null) => void }) {

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
            </span>
          </span>
        </div>
      ) : null}
      {route && (
        <button type="button" onClick={() => onChange(null)} className="btn btn-quiet">
          Retirer le trajet
        </button>
      )}
    </section>
  )
}

export type { Route }
