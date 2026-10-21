import { waitForPendingWrites } from 'firebase/firestore'
import { useEffect } from 'react'
import { db } from '../../firebase/app'
import { isNative } from '../../native'
import { FlairNative } from '../../native/flair'

/**
 * T-061 (app iOS, propriétaire) : les balades enregistrées hors ligne gardent leur copie sur l’iPhone jusqu’à ce que
 * le serveur ait tout reçu. Au lancement, au retour du réseau et au premier plan : on attend la confirmation
 * (`waitForPendingWrites`), puis on efface ces copies.
 */
export function PendingWalksSync() {
  useEffect(() => {
    if (!isNative()) return
    let running = false
    const flush = async () => {
      if (running || !navigator.onLine) return
      running = true
      try {
        const { ids } = await FlairNative.pendingSent()
        if (!ids.length) return
        await waitForPendingWrites(db)
        await FlairNative.clearSent({ ids })
      } catch {
        // Rien n’est effacé : on réessaiera au prochain retour du réseau.
      } finally {
        running = false
      }
    }
    void flush()
    const onVisible = () => document.visibilityState === 'visible' && void flush()
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return null
}
