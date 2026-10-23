import type { Route } from './route'
import type { TimelineEvent } from './walkTimeline'
import { hrSummary, sheetStats } from './walkSheet'
import { paceCategory, type PaceCategory } from './walkStory'

// R-095 « Fiche sans trous » : un bloc de la fiche d’une balade n’apparaît que s’il a au moins une valeur utile.
// Fonctions pures, testées ; le composant ne fait que mettre en page.

/** Montée ou descente sous ce seuil : pas de bloc « Le relief » (une ligne plate, « 0 m · 0 m »). */
export const RELIEF_MIN_M = 10

export interface SheetBlocks {
  /** Durée, distance, puis en marche et arrêts, ou l’allure moyenne : 3 ou 4 cases, jamais à 0. */
  stats: { value: string; label: string; spoken?: string }[]
  /** La courbe d’allure : seulement sur un trajet daté (GPS, Watch, fichier daté). */
  pace: boolean
  /** La ligne sous la courbe : « 32 min tranquille · 2 min rapide · 2 min à l’arrêt ». */
  paceLine?: string
  /** « Ce qui s’est passé » : au moins un arrêt, un repère, un passage rapide ou une photo. */
  timeline: boolean
  relief: boolean
  /** Cœur, pas, énergie (balade de la Watch, ou du GPS avec la Watch au poignet). */
  body: boolean
  /** La météo sur une ligne : « 11 °C, ressenti 8 °C · vent 18 km/h · sec ». */
  weatherLine?: string
  /** Au moins une photo ; sinon le lien « Ajouter un mot ou une photo ». */
  photos: boolean
}

const minText = (n: number) => `${n} min`

/**
 * La ligne sous la courbe d’allure : les minutes de chaque allure (« 32 min tranquille · 2 min rapide · 2 min à
 * l’arrêt »), et « sans pause » quand il n’y en a pas eu (la frise n’est alors plus là pour le dire).
 */
export function paceLine(pace: number[], stops: number): string | undefined {
  if (!pace.length) return undefined
  const minutes: Record<PaceCategory, number> = { tranquille: 0, rapide: 0, arret: 0 }
  for (const kmh of pace) minutes[paceCategory(kmh)]++
  const noPause = !minutes.arret && !stops
  if (noPause && !minutes.rapide) return 'Marche tranquille, sans pause.'
  const parts = [minutes.tranquille ? `${minText(minutes.tranquille)} tranquille` : '', minutes.rapide ? `${minText(minutes.rapide)} rapide` : '', minutes.arret ? `${minText(minutes.arret)} à l’arrêt` : ''].filter(Boolean)
  return `${parts.join(' · ')}${noPause ? ', sans pause.' : ''}`
}

const deg = (c: number) => `${Math.round(c)} °C`

/** « 11 °C, ressenti 8 °C · vent 18 km/h · sec » : seulement ce qu’on sait ; le ressenti s’il diffère. */
export function weatherLine(weather: Route['weather']): string | undefined {
  if (!weather || !Number.isFinite(weather.tempC)) return undefined
  const feels = weather.feelsC !== undefined && Math.round(weather.feelsC) !== Math.round(weather.tempC) ? `, ressenti ${deg(weather.feelsC)}` : ''
  const parts = [`${deg(weather.tempC)}${feels}`]
  if (weather.windKmh !== undefined) parts.push(`vent ${Math.round(weather.windKmh)} km/h`)
  if (weather.rainMm !== undefined) parts.push(weather.rainMm < 0.1 ? 'sec' : `pluie ${String(Math.round(weather.rainMm * 10) / 10).replace('.', ',')} mm`)
  return parts.join(' · ')
}

/** Ce que la fiche d’une balade montre (R-095), bloc par bloc. */
export function sheetBlocks(route: Route, { photos, events }: { photos: number; events: Pick<TimelineEvent, 'kind'>[] }): SheetBlocks {
  const pace = Boolean(route.track && route.pace && route.pace.length > 1)
  const line = pace ? paceLine(route.pace!, route.stops?.length ?? 0) : undefined
  const weather = weatherLine(route.weather)
  return {
    stats: sheetStats(route),
    pace,
    ...(line ? { paceLine: line } : {}),
    timeline: photos > 0 || events.some((e) => e.kind === 'stop' || e.kind === 'moment' || e.kind === 'fast'),
    relief: Math.max(route.ascentM ?? 0, route.descentM ?? 0) >= RELIEF_MIN_M,
    body: Boolean(hrSummary(route.hr) || route.steps || route.energyKcal),
    ...(weather ? { weatherLine: weather } : {}),
    photos: photos > 0,
  }
}
