import { getDoc, setDoc } from 'firebase/firestore'
import { accountDoc, send } from '../../firebase/paths'
import type { Entry, FogZone, WithId } from '../../firebase/types'
import { knownImportKeys } from '../../lib/activity'
import type { Bone } from '../../lib/bones'
import type { Commune } from '../../lib/commune'
import type { ISODate } from '../../lib/dates'
import { withoutGpsDuplicates } from '../../lib/gpsWalk'
import { newWatchWalks, shouldSync, watchActivity, watchSince } from '../../lib/watch'
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
let running = false
let optedThisSession = false

export interface WatchContext {
  entries: WithId<Entry>[]
  bones: Bone[]
  fog: WithId<FogZone>[]
  communes: (Commune & { id: string })[]
  today: ISODate
  times: WalkTimes
}

/** Lit les nouvelles marches et les importe. Appelle `onAdded(n)` si au moins une balade est arrivée. */
export async function syncWatch(ctx: () => WatchContext, onAdded: (count: number) => void): Promise<void> {
  const now = Date.now()
  if (running || !shouldSync(lastRun, now)) return
  running = true
  lastRun = now
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
    // Délais maximum (R-042) : une lecture bloquée n’empêche jamais les suivantes.
    const read = await withTimeout(FlairNative.getWalks({ since }), 60_000, 'getWalks')
    if (!read.available) return
    const first = !saved?.watchSyncedAt || watchLooksBlocked()
    if (read.walks.length) setLooksBlocked(false)
    else if (first && read.workouts === 0) setLooksBlocked(true)
    const data = ctx()
    const fresh = withoutGpsDuplicates(newWatchWalks(read.walks, data.entries.map((e) => e.route ?? {})), data.entries)
    if (fresh.length) {
      const result = await withTimeout(importActivities(fresh.length, async (i) => watchActivity(fresh[i]!), { knownKeys: knownImportKeys(data.entries), bones: data.bones, fog: data.fog, communes: data.communes, today: data.today, times: data.times }, () => undefined, { source: 'watch' }), 15_000 + 2_000 * fresh.length, 'enregistrement')
      // Rien n’avance tant que les marches ne sont pas dans la base locale (R-045) : sinon, elles seront relues.
      await ensureSavedLocally(result.walks.map((w) => w.entryId), entryInLocalCache)
      if (result.walks.length) onAdded(result.walks.length)
    }
    // Seulement après un enregistrement réussi : en cas d’échec, la prochaine lecture reprend les mêmes marches
    // (celles déjà enregistrées sont écartées par leur clé).
    send(setDoc(accountDoc(), { watchSyncedAt: startedAt }, { merge: true }))
  } catch (error) {
    console.error('Lecture des marches de la Watch impossible', error)
    // Firestore en panne (R-042) : l’app se recharge ; les mêmes marches seront relues (rien n’est perdu).
    if (isFirestoreCrash(error) || error instanceof NotSavedError) recoverFromFirestoreCrash()
  } finally {
    running = false
  }
}
