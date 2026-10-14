import { saveRoute } from '../../firebase/db'
import { newId } from '../../firebase/paths'
import { routesToDrop, toStored, type StoredSavedRoute } from '../../lib/route'
import type { TraceResult } from './Tracer'

/**
 * Après « Enregistrer » : garder le tracé comme trajet habituel (20 au plus, les moins récents partent),
 * ou noter que le trajet habituel repris vient d'être utilisé.
 */
export function keepRoute({ route, keep }: TraceResult, routes: (StoredSavedRoute & { id: string })[]): void {
  const now = new Date().toISOString()
  if (keep) {
    const id = newId('routes')
    const all = [...routes, { id, lastUsedAt: now }]
    saveRoute(id, { name: keep, points: toStored(route.points), distanceM: route.distanceM, lastUsedAt: now }, routesToDrop(all))
    return
  }
  const used = routes.find((r) => r.id === route.savedRouteId)
  if (used) saveRoute(used.id, { name: used.name, points: used.points, distanceM: used.distanceM, lastUsedAt: now })
}
