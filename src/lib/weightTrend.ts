import { dayNumber, type ISODate } from './dates'

// R-062 : la tendance du poids dite en clair sous la courbe (« +1,2 kg en 30 jours »).

export interface WeightPoint {
  date: ISODate
  kg: number
}

const kg = (n: number) => n.toFixed(1).replace('.', ',')

/** Entre les deux dernières pesées : « +1,2 kg en 30 jours », « −0,4 kg en 1 jour », « Stable depuis 12 jours ». */
export function weightTrend(weights: WeightPoint[]): string | null {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return null
  const last = sorted[sorted.length - 1]!
  const before = sorted[sorted.length - 2]!
  const days = dayNumber(last.date) - dayNumber(before.date)
  if (days <= 0) return null
  const span = `${days} jour${days > 1 ? 's' : ''}`
  const diff = Math.round((last.kg - before.kg) * 10) / 10
  if (diff === 0) return `Stable depuis ${span}`
  return `${diff > 0 ? '+' : '−'}${kg(Math.abs(diff))} kg en ${span}`
}
