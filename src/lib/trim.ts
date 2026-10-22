import { simplify, toStored, fromStored, type Route, type RoutePoint, type RouteStop } from './route'
import { sliceTrack, trackDistance, type Track } from './track'
import { routeStory, windowOf, type Window } from './walkStory'

// Recadrer le début et la fin d’une balade (spec V6 § 8.3, T-090) : on garde la portion choisie, on recalcule la
// distance, la durée, les arrêts et l’allure ; le trajet daté d’origine reste entier (on peut revenir en arrière).
// Le brouillard déjà levé ne redescend jamais : rien ici ne touche au brouillard. Fonctions pures, testées.

/** Au moins 2 minutes gardées. */
export const TRIM_MIN_S = 120
/** Les poignées avancent de 15 s (clavier, VoiceOver). */
export const TRIM_STEP_S = 15
/** Les points de la carte (comme à l’import) : 200 au plus. */
const MAP_POINTS = 200

/** La fenêtre gardée d’une balade recadrée (secondes depuis le départ), sinon rien. */
export const trimWindow = (route: Pick<Route, 'trimmed' | 'track'>): Window | undefined => (route.trimmed && route.track ? [route.trimmed.startS, route.trimmed.endS] : undefined)

/** Le trajet daté à afficher : la portion gardée après un recadrage, sinon tout. Les heures restent celles d’origine. */
export function effectiveTrack(route: Pick<Route, 'trimmed' | 'track'>): Track | undefined {
  const window = trimWindow(route)
  return route.track && window ? sliceTrack(route.track, window) : route.track
}

/** 200 points au plus, le premier et le dernier gardés. */
function thin(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= MAP_POINTS) return points
  const every = Math.ceil(points.length / MAP_POINTS)
  return points.filter((_, i) => i % every === 0 || i === points.length - 1)
}

/** Les rues déjà trouvées restent sur les arrêts recalculés qui commencent à la même seconde. */
const keepStreets = (stops: RouteStop[], before: RouteStop[] | undefined) =>
  stops.map((s) => {
    const street = before?.find((b) => b.at === s.at && b.street)?.street
    return street ? { ...s, street } : s
  })

/** Les arrêts et l’allure recalculés pour la fenêtre du trajet (rien sans trajet daté). */
function withStory(route: Route): Route {
  const story = routeStory(route)
  return story ? { ...route, stops: keepStreets(story.stops, route.stops), pace: story.pace } : route
}

/** Revenir au trajet d’origine : distance, durée et points d’avant, arrêts et allure sur toute la balade. */
export function untrimRoute(route: Route): Route {
  if (!route.trimmed) return route
  const { trimmed, durationMin: _d, ...rest } = route
  const original = trimmed.original
  // Sans valeurs d’origine gardées (donnée abîmée) : celles du trajet daté entier.
  const full = route.track
  const back: Route = original
    ? { ...rest, distanceM: original.distanceM, points: fromStored(original.points), ...(original.durationMin !== undefined ? { durationMin: original.durationMin } : {}) }
    : full
      ? { ...rest, distanceM: Math.round(trackDistance(full)), points: thin(simplify(full.t.map((_, i): RoutePoint => [full.lat[i]!, full.lng[i]!]))), durationMin: Math.max(1, Math.round((windowOf(full)[1] - windowOf(full)[0]) / 60)) }
      : rest
  return withStory(back)
}

/**
 * Garder la portion [début, fin] (secondes depuis le départ). Bornée au trajet, 2 minutes au moins ; la balade entière
 * revient au trajet d’origine. Les valeurs d’origine sont gardées une seule fois (un deuxième recadrage part toujours
 * du trajet entier).
 */
export function trimRoute(route: Route, startS: number, endS: number): Route {
  const track = route.track
  if (!track) return route
  const [first, last] = windowOf(track)
  let [a, b] = windowOf(track, [Math.round(startS), Math.round(endS)])
  if (b - a < TRIM_MIN_S) {
    b = Math.min(last, a + TRIM_MIN_S)
    a = Math.max(first, b - TRIM_MIN_S)
  }
  if (a <= first && b >= last) return untrimRoute(route)
  const original = route.trimmed?.original ?? { distanceM: route.distanceM, points: toStored(route.points), ...(route.durationMin !== undefined ? { durationMin: route.durationMin } : {}) }
  const kept = sliceTrack(track, [a, b])
  return withStory({
    ...route,
    points: thin(simplify(kept.t.map((_, i): RoutePoint => [kept.lat[i]!, kept.lng[i]!]))),
    distanceM: Math.round(trackDistance(kept)),
    durationMin: Math.max(1, Math.round((b - a) / 60)),
    trimmed: { startS: a, endS: b, original },
  })
}
