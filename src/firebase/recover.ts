import { isFirestoreCrash, mayReload } from '../lib/firestoreCrash'

// R-042 : si Firestore tombe en panne (IndexedDB coupé par iOS en arrière-plan), l'app se recharge dès qu'elle revient
// au premier plan. Elle rouvre le même écran ; une balade de l'iPhone en cours continue, une balade arrêtée
// mais pas enregistrée est enregistrée (elle est gardée sur l'iPhone jusque-là).

const KEY = 'billy.rechargement-firestore'

function lastReload(): number | undefined {
  try {
    const value = sessionStorage.getItem(KEY)
    return value ? Number(value) : undefined
  } catch {
    return undefined
  }
}

let pending = false

/** Recharge l'app (tout de suite si elle est affichée, sinon à son retour au premier plan). */
export function recoverFromFirestoreCrash(): void {
  if (pending || !mayReload(lastReload(), Date.now())) return
  pending = true
  const reload = () => {
    try {
      sessionStorage.setItem(KEY, String(Date.now()))
      // T-066 : noté au journal après le rechargement (Firestore est en panne maintenant).
      sessionStorage.setItem('flair.rechargement', 'firestoreCrash')
    } catch {
      // Stockage indisponible : la limite d'un rechargement toutes les 30 s ne joue pas, tant pis.
    }
    window.location.reload()
  }
  if (document.visibilityState === 'visible') reload()
  else {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', onVisible)
      reload()
    }
    document.addEventListener('visibilitychange', onVisible)
  }
}

/** À appeler une fois au démarrage : surveille les erreurs non rattrapées. */
export function watchFirestoreCrash(): void {
  window.addEventListener('error', (event) => {
    if (isFirestoreCrash(event.error ?? event.message)) recoverFromFirestoreCrash()
  })
  window.addEventListener('unhandledrejection', (event) => {
    if (isFirestoreCrash(event.reason)) recoverFromFirestoreCrash()
  })
}
