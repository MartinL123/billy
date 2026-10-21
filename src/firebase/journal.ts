import { arrayUnion, setDoc } from 'firebase/firestore'
import { auth } from './app'
import { send, userDoc, viewedOwnerUid } from './paths'
import { todayISO } from '../lib/dates'
import type { JournalEvent } from '../lib/journal'

// T-066 : le journal privé, sous users/{uid}/journal/{AAAA-MM-JJ}. Une écriture par événement, jamais pour un
// visiteur, jamais ailleurs que dans le compte. Hors ligne, l'écriture part au retour du réseau, comme le reste.

type NewEvent = JournalEvent extends infer E ? (E extends { at: string } ? Omit<E, 'at'> : never) : never

export function logEvent(event: NewEvent): void {
  try {
    if (viewedOwnerUid() || !auth.currentUser) return
    const now = new Date()
    const day = todayISO(now)
    send(setDoc(userDoc('journal', day), { date: day, events: arrayUnion({ ...event, at: now.toISOString() }) }, { merge: true }))
  } catch {
    // Le journal ne fait jamais échouer ce qu'il mesure.
  }
}

const SESSION_KEY = 'flair.seance-debut'
const OPEN_KEY = 'flair.ouverture'

/** Une séance commence (mission du jour, exercice d'une compétence). */
export function sessionStart(skill?: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now(), skill }))
  } catch {
    // Sans stockage : la durée ne sera pas connue.
  }
  logEvent({ type: 'session_start', ...(skill ? { skill } : {}) })
}

/** La séance est notée : sa durée depuis `sessionStart` (si on la connaît, et moins d'une heure). */
export function sessionDone(skill?: string): void {
  let sec: number | undefined
  try {
    const started = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as { at: number } | null
    if (started) sec = Math.round((Date.now() - started.at) / 1000)
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Durée inconnue.
  }
  logEvent({ type: 'session_done', ...(skill ? { skill } : {}), ...(sec && sec < 3600 ? { sec } : {}) })
}

/** Une ouverture de l'app, au plus une par heure. */
export function appOpened(native: boolean): void {
  try {
    const last = Number(localStorage.getItem(OPEN_KEY) ?? 0)
    if (Date.now() - last < 3600_000) return
    localStorage.setItem(OPEN_KEY, String(Date.now()))
  } catch {
    // Sans stockage : on l'écrit quand même.
  }
  logEvent({ type: 'app_open', native })
}
