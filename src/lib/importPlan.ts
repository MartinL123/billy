import { addDays, type ISODate } from './dates'
import { isWalk, ignoredLabel, toImported, type Activity, type ImportedActivity } from './activity'

// Ce que fait l'import d'un lot de fichiers (carte-a-decouvrir.md § 6), sans Firestore : trier, sauter les doublons,
// compter ce qui est ignoré, dire quelles balades rapportent des os.

export interface ImportTally {
  added: ImportedActivity[]
  duplicates: number
  /** « à vélo » → 3 */
  ignored: Record<string, number>
  unreadable: number
}

export const emptyTally = (): ImportTally => ({ added: [], duplicates: 0, ignored: {}, unreadable: 0 })

/** Ajoute une activité lue au bilan. `known` : les clés déjà dans Billy (et celles déjà ajoutées dans ce lot). */
export function tallyActivity(tally: ImportTally, activity: Activity | undefined, known: Set<string>): ImportedActivity | undefined {
  if (!activity || activity.points.length < 2) {
    tally.unreadable++
    return undefined
  }
  if (!isWalk(activity.type)) {
    const label = ignoredLabel(activity.type)
    tally.ignored[label] = (tally.ignored[label] ?? 0) + 1
    return undefined
  }
  const walk = toImported(activity)
  if (!walk) {
    tally.unreadable++
    return undefined
  }
  if (known.has(walk.key)) {
    tally.duplicates++
    return undefined
  }
  known.add(walk.key)
  tally.added.push(walk)
  return walk
}

/** Les os : seulement pour une balade des 7 derniers jours (pas d'os rétroactifs pour des mois d'historique). */
export const earnsBones = (date: ISODate | undefined, today: ISODate) => Boolean(date && date <= today && date > addDays(today, -7))

/** « 3 sorties à vélo ignorées · 0 balade déjà importée. » */
export function ignoredLine(tally: ImportTally): string {
  const parts = Object.entries(tally.ignored).map(([label, n]) => `${n} sortie${n > 1 ? 's' : ''} ${label} ignorée${n > 1 ? 's' : ''}`)
  parts.push(`${tally.duplicates} balade${tally.duplicates > 1 ? 's' : ''} déjà importée${tally.duplicates > 1 ? 's' : ''}`)
  if (tally.unreadable) parts.push(`${tally.unreadable} fichier${tally.unreadable > 1 ? 's' : ''} illisible${tally.unreadable > 1 ? 's' : ''}`)
  return `${parts.join(' · ')}.`
}
