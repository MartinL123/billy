import { getDoc, setDoc } from 'firebase/firestore'
import { accountDoc, send } from '../../firebase/paths'
import type { Entry, FogZone, WithId } from '../../firebase/types'
import { knownImportKeys } from '../../lib/activity'
import type { Bone } from '../../lib/bones'
import type { Commune } from '../../lib/commune'
import type { ISODate } from '../../lib/dates'
import { withoutGpsDuplicates } from '../../lib/gpsWalk'
import { newWatchWalks, shouldSync, watchActivity, watchChunks, watchSince } from '../../lib/watch'
import type { WalkTimes } from '../../lib/walks'
import { withTimeout } from '../../lib/timeout'
import { isFirestoreCrash } from '../../lib/firestoreCrash'
import { ensureSavedLocally, NotSavedError } from '../../lib/localSave'
import { entryInLocalCache } from '../../firebase/imports'
import { recoverFromFirestoreCrash } from '../../firebase/recover'
import { FlairNative } from '../../native/flair'
import { importActivities } from './importRun'

// Les marches de l'Apple Watch arrivent seules (app iOS, T-001) : à l'ouverture et au retour au premier plan, au plus
// une fois toutes les 5 minutes. Même circuit que l'import d'un fichier GPX.

/** Aucune séance trouvée à la première lecture : la lecture n'est peut-être pas autorisée (iOS ne le dit jamais). */
const EMPTY_KEY = 'billy.watch-vide'

export function watchLooksBlocked(): boolean {
  try {
    return localStorage.getItem(EMPTY_KEY) === '1'
  } catch {
    return false
  }
}

function setLooksBlocked(blocked: boolean) {
  try {
    if (blocked) localStorage.setItem(EMPTY_KEY, '1')
    else localStorage.removeItem(EMPTY_KEY)
  } catch {
    // Stockage indisponible : la ligne d'aide ne s'affiche pas, ce n'est pas grave.
  }
}

/** R-079 : la lecture des marches (et donc la fenêtre Santé d’iOS) n’arrive qu’une fois choisie par la personne. */
const OPT_IN_KEY = 'flair.montre'

export function watchOptedIn(): boolean {
  try {
    return localStorage.getItem(OPT_IN_KEY) === 'oui'
  } catch {
    return false
  }
}

/** « Retrouver les balades de ma montre » : choisi ; la prochaine synchro demande l’accès à Santé. */
export function optInWatch(): void {
  try {
    localStorage.setItem(OPT_IN_KEY, 'oui')
  } catch {
    // Stockage indisponible : le choix vaut pour cette ouverture.
  }
  lastRun = undefined
  optedThisSession = true
  window.dispatchEvent(new Event('flair:montre'))
}

let lastRun: number | undefined
/** La lecture en cours, s'il y en a une : jamais deux à la fois. */
let current: Promise<void> | undefined
let optedThisSession = false

export interface WatchContext {
  entries: WithId<Entry>[]
  bones: Bone[]
  fog: WithId<FogZone>[]
  communes: (Commune & { id: string })[]
  today: ISODate
  times: WalkTimes
}

/**
 * Lit les nouvelles marches et les importe. Appelle `onAdded(n, ids)` si au moins une balade est arrivée.
 * `force` (T-084, notification touchée) passe outre le délai de 5 minutes ; si une lecture est déjà en cours, on attend
 * la fin de celle-ci.
 */
export function syncWatch(ctx: () => WatchContext, onAdded: (count: number, entryIds: string[]) => void, options: { force?: boolean } = {}): Promise<void> {
  if (current) return options.force ? current : Promise.resolve()
  const now = Date.now()
  if (!options.force && !shouldSync(lastRun, now)) return Promise.resolve()
  lastRun = now
  current = readAndImport(ctx, onAdded, now).finally(() => {
    current = undefined
  })
  return current
}

async function readAndImport(ctx: () => WatchContext, onAdded: (count: number, entryIds: string[]) => void, now: number): Promise<void> {
  try {
    const startedAt = new Date(now).toISOString()
    const saved = (await getDoc(accountDoc())).data() as { watchSyncedAt?: string } | undefined
    // R-079 : pas de lecture (ni de fenêtre Santé) sans accord. Un compte qui lisait déjà ses marches reste branché.
    if (!watchOptedIn() && !optedThisSession) {
      if (!saved?.watchSyncedAt) return
      optInWatch()
    }
    // Rien trouvé la première fois : on relit les 30 derniers jours, au cas où la lecture vient d'être autorisée.
    const since = watchSince(watchLooksBlocked() ? undefined : saved?.watchSyncedAt, new Date(now))
    // Une balade de l’iPhone en cours : on attend qu’elle soit gardée (sinon la séance Watch du même moment passerait avant).
    const current = await withTimeout(FlairNative.currentWalk(), 10_000, 'currentWalk')
    // Une balade iPhone en cours bloque la synchro ; pas une balade déjà enregistrée qui attend le réseau (T-061).
    if (current.active && !current.savedAs) return
    const first = !saved?.watchSyncedAt || watchLooksBlocked()
    // R-104 : plus de 7 jours à rattraper (l’app iOS a expiré) : une tranche de 7 jours à la fois. La date de lecture
    // avance à la fin de chaque tranche enregistrée ; une tranche qui échoue sera reprise à la prochaine ouverture.
    const chunks = watchChunks(since, new Date(now))
    let found = 0
    let workouts = 0
    for (const [i, chunk] of chunks.entries()) {
      // Délais maximum (R-042) : une lecture bloquée n’empêche jamais les suivantes.
      const read = await withTimeout(FlairNative.getWalks({ since: chunk.since, until: chunk.until }), 60_000, 'getWalks')
      if (!read.available) return
      // Une app iOS plus ancienne ne connaît pas `until` : la fin de la tranche est filtrée ici.
      const end = Date.parse(chunk.until)
      const walks = read.walks.filter((w) => Date.parse(w.start) < end)
      found += walks.length
      workouts += read.workouts
      const data = ctx()
      const fresh = withoutGpsDuplicates(newWatchWalks(walks, data.entries.map((e) => e.route ?? {})), data.entries)
      if (fresh.length) {
        const result = await withTimeout(importActivities(fresh.length, async (j) => watchActivity(fresh[j]!), { knownKeys: knownImportKeys(data.entries), bones: data.bones, fog: data.fog, communes: data.communes, today: data.today, times: data.times }, () => undefined, { source: 'watch' }), 15_000 + 2_000 * fresh.length, 'enregistrement')
        // Rien n’avance tant que les marches ne sont pas dans la base locale (R-045) : sinon, elles seront relues.
        await ensureSavedLocally(result.walks.map((w) => w.entryId), entryInLocalCache)
        if (result.walks.length) onAdded(result.walks.length, result.walks.map((w) => w.entryId))
      }
      // Seulement après un enregistrement réussi : en cas d’échec, la prochaine lecture reprend les mêmes marches
      // (celles déjà enregistrées sont écartées par leur clé). La dernière tranche finit à l’heure du début de lecture.
      send(setDoc(accountDoc(), { watchSyncedAt: i === chunks.length - 1 ? startedAt : chunk.until }, { merge: true }))
    }
    if (found) setLooksBlocked(false)
    else if (first && workouts === 0) setLooksBlocked(true)
  } catch (error) {
    console.error('Lecture des marches de la Watch impossible', error)
    // Firestore en panne (R-042) : l’app se recharge ; les mêmes marches seront relues (rien n’est perdu).
    if (isFirestoreCrash(error) || error instanceof NotSavedError) recoverFromFirestoreCrash()
  }
}
