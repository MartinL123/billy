import { revealFog } from '../../firebase/fog'
import { saveImportedWalk } from '../../firebase/imports'
import type { FogZone, WithId } from '../../firebase/types'
import { isGpxFile, parseActivity, readActivityFile, MAX_GPX_BYTES, type Activity } from '../../lib/activity'
import type { Bone } from '../../lib/bones'
import type { Commune } from '../../lib/commune'
import type { ISODate } from '../../lib/dates'
import { emptyTally, ignoredLine, tallyActivity, type ImportTally } from '../../lib/importPlan'
import type { RoutePoint } from '../../lib/route'
import type { WalkTimes } from '../../lib/walks'
import { logEvent } from '../../firebase/journal'

/** Le résultat d’un import, pour l’écran « Balades ajoutées ». */
export interface ImportResult {
  walks: { entryId: string; name: string; date: ISODate; distanceM: number; durationMin?: number; points: RoutePoint[] }[]
  distanceM: number
  newCells: number
  line: string
  /** Les os gagnés par ces balades (fin de balade : la pastille « +3 os », T-051). */
  gained: Bone[]
}

let last: ImportResult | null = null
export const takeImportResult = () => last

type ImportContext = { knownKeys: Set<string>; bones: Bone[]; fog: WithId<FogZone>[]; communes: (Commune & { id: string })[]; today: ISODate; times: WalkTimes }

/**
 * Importe un lot de fichiers, un par un (« 12 sur 85 ») : lecture, tri, doublons, moment du Carnet, os des 7 derniers
 * jours, puis le brouillard sur les points complets. Hors ligne, tout part dans le cache Firestore.
 */
export async function runImport(files: File[], ctx: ImportContext, onProgress: (done: number, total: number) => void): Promise<ImportResult> {
  const tally = emptyTally()
  const usable = files.filter((f) => isGpxFile(f.name) && f.size <= MAX_GPX_BYTES)
  tally.unreadable += files.filter((f) => /\.gpx(\.gz)?$/i.test(f.name) && f.size > MAX_GPX_BYTES).length
  const read = async (i: number) => {
    try {
      return parseActivity(await readActivityFile(usable[i]!))
    } catch {
      return undefined
    }
  }
  return importActivities(usable.length, read, ctx, onProgress, { tally })
}

/**
 * Le circuit commun (fichiers GPX, marches de l’Apple Watch) : `read(i)` donne la i-ème activité déjà lue.
 * `source` : d’où vient la balade (`'watch'` dans l’app iOS).
 */
export async function importActivities(
  count: number,
  read: (index: number) => Promise<Activity | undefined>,
  ctx: ImportContext,
  onProgress: (done: number, total: number) => void,
  { tally = emptyTally(), source = 'strava' }: { tally?: ImportTally; source?: 'strava' | 'watch' | 'gps' } = {},
): Promise<ImportResult> {
  const walks: ImportResult['walks'] = []
  const tracks: { lat: number; lng: number }[][] = []
  let bones = [...ctx.bones]
  const gained: Bone[] = []
  for (let i = 0; i < count; i++) {
    onProgress(i, count)
    const walk = tallyActivity(tally, await read(i), ctx.knownKeys)
    if (!walk) continue
    const saved = saveImportedWalk(walk, bones, ctx.today, ctx.times, source)
    bones = [...bones, ...saved.bones]
    gained.push(...saved.bones)
    tracks.push(walk.full)
    walks.push({ entryId: saved.entryId, name: saved.name, date: walk.date ?? ctx.today, distanceM: walk.distanceM, ...(walk.durationMin ? { durationMin: walk.durationMin } : {}), points: walk.points })
    // Laisser respirer l’écran entre deux fichiers (barre de progression, gestes).
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  onProgress(count, count)

  const newCells = tracks.length ? revealFog(tracks, ctx.fog) : 0

  // Les mois récents d’abord.
  walks.sort((a, b) => b.date.localeCompare(a.date))
  last = { walks, distanceM: walks.reduce((sum, w) => sum + w.distanceM, 0), newCells, line: ignoredLine(tally), gained }
  // T-066 : journal privé (la balade GPS est notée par l’écran de la balade, après vérification).
  if (source !== 'gps') for (const w of walks) logEvent({ type: 'walk_saved', source: source === 'watch' ? 'watch' : 'gpx', m: Math.round(w.distanceM), ...(w.durationMin ? { min: w.durationMin } : {}) })
  return last
}
