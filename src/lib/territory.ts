import { formatRelative, type ISODate } from './dates'

// Le territoire d'un chien (communaute.md § 5) : les spots qu'il a marqués, gardés pour toujours (la carte, elle,
// n'affiche les marques que 7 jours). Pas de classement : on compte ses propres spots, jamais contre les autres.

interface MarkLike {
  spotId: string
  uid: string
  dogName: string
  date: ISODate
}

export interface TerritorySpot<S> {
  spot: S
  /** Nombre de jours où il l'a marqué. */
  times: number
  last: ISODate
  /** Nouveau ce mois : sa première marque date de ce mois-ci. */
  isNew: boolean
  /** Les chiens passés au même spot le même jour que sa dernière marque. */
  together: string[]
}

export interface Territory<S> {
  spots: TerritorySpot<S>[]
  newThisMonth: number
  /** Le chien avec qui il partage le plus de spots, s'il y en a un. */
  shared?: { dogName: string; count: number }
}

export function territoryOf<S extends { id: string }>(me: string, marks: MarkLike[], spots: S[], today: ISODate): Territory<S> {
  const mine = marks.filter((m) => m.uid === me)
  const month = today.slice(0, 7)
  const list: TerritorySpot<S>[] = []
  for (const spot of spots) {
    const dates = [...new Set(mine.filter((m) => m.spotId === spot.id).map((m) => m.date))].sort()
    if (dates.length === 0) continue
    const last = dates[dates.length - 1]!
    const together = [...new Set(marks.filter((m) => m.uid !== me && m.spotId === spot.id && m.date === last).map((m) => m.dogName))]
    list.push({ spot, times: dates.length, last, isNew: dates[0]!.startsWith(month), together })
  }
  list.sort((a, b) => b.last.localeCompare(a.last) || b.times - a.times)

  const mySpots = new Set(list.map((t) => t.spot.id))
  const common = new Map<string, Set<string>>()
  for (const m of marks) {
    if (m.uid === me || !mySpots.has(m.spotId)) continue
    common.set(m.dogName, (common.get(m.dogName) ?? new Set()).add(m.spotId))
  }
  const best = [...common.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))[0]
  return { spots: list, newThisMonth: list.filter((t) => t.isNew).length, ...(best ? { shared: { dogName: best[0], count: best[1].size } } : {}) }
}

/** « Marqué 14 fois · aujourd'hui avec Oslo · nouveau ce mois » */
export function territoryLine(t: TerritorySpot<unknown>, today: ISODate): string {
  const when = formatRelative(t.last, today)
  return [`Marqué ${t.times} fois`, t.together.length ? `${when} avec ${t.together.join(' et ')}` : when, t.isNew ? 'nouveau ce mois' : ''].filter(Boolean).join(' · ')
}

export const spotsCount = (n: number) => `${n} spot${n > 1 ? 's' : ''} marqué${n > 1 ? 's' : ''}`
