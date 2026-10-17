import { fetchCommune } from '../../firebase/communes'
import { revealFog } from '../../firebase/fog'
import { saveImportedWalk } from '../../firebase/imports'
import type { FogZone, WithId } from '../../firebase/types'
import { isGpxFile, parseActivity, readActivityFile, MAX_GPX_BYTES } from '../../lib/activity'
import type { Bone } from '../../lib/bones'
import { communeAt, type Commune } from '../../lib/commune'
import type { ISODate } from '../../lib/dates'
import { discoveredShare, inPolygon, knownFog, revealedCells } from '../../lib/fog'
import { emptyTally, ignoredLine, tallyActivity } from '../../lib/importPlan'
import type { RoutePoint } from '../../lib/route'
import type { WalkTimes } from '../../lib/walks'

/** Le résultat d'un import, pour l'écran « Le brouillard s'est levé ! ». */
export interface ImportResult {
  walks: { entryId: string; name: string; date: ISODate; distanceM: number; durationMin?: number; points: RoutePoint[] }[]
  distanceM: number
  newCells: number
  /** Part de la commune découverte, avant et après (si la commune est connue). */
  share?: { name: string; before: number; after: number }
  line: string
}

let last: ImportResult | null = null
export const takeImportResult = () => last

/**
 * Importe un lot de fichiers, un par un (« 12 sur 85 ») : lecture, tri, doublons, moment du Carnet, os des 7 derniers
 * jours, puis le brouillard sur les points complets. Hors ligne, tout part dans le cache Firestore.
 */
export async function runImport(
  files: File[],
  ctx: { knownKeys: Set<string>; bones: Bone[]; fog: WithId<FogZone>[]; communes: (Commune & { id: string })[]; today: ISODate; times: WalkTimes },
  onProgress: (done: number, total: number) => void,
): Promise<ImportResult> {
  const tally = emptyTally()
  const walks: ImportResult['walks'] = []
  const tracks: { lat: number; lng: number }[][] = []
  let bones = [...ctx.bones]
  const usable = files.filter((f) => isGpxFile(f.name) && f.size <= MAX_GPX_BYTES)
  tally.unreadable += files.filter((f) => /\.gpx(\.gz)?$/i.test(f.name) && f.size > MAX_GPX_BYTES).length
  for (const [i, file] of usable.entries()) {
    onProgress(i, usable.length)
    let activity
    try {
      activity = parseActivity(await readActivityFile(file))
    } catch {
      activity = undefined
    }
    const walk = tallyActivity(tally, activity, ctx.knownKeys)
    if (!walk) continue
    const saved = saveImportedWalk(walk, bones, ctx.today, ctx.times)
    bones = [...bones, ...saved.bones]
    tracks.push(walk.full)
    walks.push({ entryId: saved.entryId, name: walk.name, date: walk.date ?? ctx.today, distanceM: walk.distanceM, ...(walk.durationMin ? { durationMin: walk.durationMin } : {}), points: walk.points })
    // Laisser respirer l'écran entre deux fichiers (barre de progression, gestes).
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  onProgress(usable.length, usable.length)

  const before = knownFog(ctx.fog)
  const newCells = tracks.length ? revealFog(tracks, ctx.fog) : 0

  // Le pourcentage de la commune de la dernière balade : contour gardé, sinon demandé une fois à Nominatim.
  let share: ImportResult['share']
  const start = tracks[tracks.length - 1]?.[0]
  if (start) {
    const commune = communeAt(ctx.communes, start, inPolygon) ?? (await fetchCommune(start.lat, start.lng))
    if (commune) {
      const after = new Set(before)
      for (const t of tracks) for (const c of revealedCells(t)) after.add(c)
      share = { name: commune.name, before: discoveredShare(before, commune), after: discoveredShare(after, commune) }
    }
  }
  // Les mois récents d'abord.
  walks.sort((a, b) => b.date.localeCompare(a.date))
  last = { walks, distanceM: walks.reduce((sum, w) => sum + w.distanceM, 0), newCells, ...(share ? { share } : {}), line: ignoredLine(tally) }
  return last
}
