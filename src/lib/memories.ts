import { addDays, addMonths, parseISO, type ISODate } from './dates'

export interface Memory<T> {
  /** « Il y a 1 semaine », « Il y a 1 mois », « Il y a 2 ans » */
  label: string
  entry: T
}

/** Dates « anniversaires » d’aujourd’hui, de la plus récente à la plus ancienne. */
export function memoryDates(today: ISODate, yearsBack: number = 15): { label: string; date: ISODate }[] {
  const dates = [
    { label: 'Il y a 1 semaine', date: addDays(today, -7) },
    { label: 'Il y a 1 mois', date: addMonths(today, -1) },
    { label: 'Il y a 3 mois', date: addMonths(today, -3) },
    { label: 'Il y a 6 mois', date: addMonths(today, -6) },
  ]
  for (let years = 1; years <= yearsBack; years++) {
    dates.push({ label: years === 1 ? 'Il y a 1 an' : `Il y a ${years} ans`, date: addMonths(today, -12 * years) })
  }
  // Un 31 n’a pas d’équivalent dans un mois de 30 jours : on ne ressort pas le souvenir du 30 deux jours de suite.
  const day = parseISO(today).d
  return dates.filter(({ date }, i) => i === 0 || parseISO(date).d === day)
}

/** Souvenirs du journal écrits « ce jour-là » : il y a une semaine, un mois, 3 mois, 6 mois, N ans. */
export function onThisDay<T extends { date: ISODate }>(entries: T[], today: ISODate): Memory<T>[] {
  const memories: Memory<T>[] = []
  for (const { label, date } of memoryDates(today)) {
    for (const entry of entries) if (entry.date === date) memories.push({ label, entry })
  }
  return memories
}
