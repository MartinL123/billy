import type { ISODate } from './dates'

export type Weather = 'soleil' | 'eclaircies' | 'nuageux' | 'averse'

export const WEATHER_LABEL: Record<Weather, string> = {
  soleil: 'Soleil',
  eclaircies: 'Éclaircies',
  nuageux: 'Nuageux',
  averse: 'Averse',
}

/** Phrase qui normalise, toujours affichée avec la météo. */
export const WEATHER_NOTE = 'Les jours de pluie font partie du chemin.'

interface ReactionLike {
  date: ISODate
  bossId: string
  reaction?: number
  createdAt?: string
}

/** Les réactions enregistrées pour un boss (séances et expositions), de la plus récente à la plus ancienne. */
export function bossReactions(records: ReactionLike[], bossId: string): number[] {
  return records
    .filter((r) => r.bossId === bossId && typeof r.reaction === 'number')
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .map((r) => r.reaction as number)
}

/**
 * Météo de confiance : la seule valeur qui varie. Moyenne des 3 dernières réactions (échelle 0–4).
 * Sans réaction enregistrée, pas de météo.
 */
export function weather(reactionsNewestFirst: number[]): Weather | undefined {
  const last = reactionsNewestFirst.slice(0, 3)
  if (last.length === 0) return undefined
  const mean = last.reduce((sum, r) => sum + r, 0) / last.length
  if (mean < 1) return 'soleil'
  if (mean < 2) return 'eclaircies'
  if (mean < 3) return 'nuageux'
  return 'averse'
}
