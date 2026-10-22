import { useCallback, useEffect, useState } from 'react'
import { setDoc } from 'firebase/firestore'
import { accountDoc, send } from '../../firebase/paths'
import { addDays, todayISO } from '../../lib/dates'
import { keptDismissed, LOOKBACK_DAYS, type MotionPeriod } from '../../lib/motionWalks'
import { isNative } from '../../native'
import { motionStatus, readMotionWalks, type MotionStatus } from '../../native/flair'

// T-085 (spec V6 § 5) : l’accès à Mouvements et forme et les marches vues par l’iPhone. App iOS seulement.

/** « Non merci » à l’invitation de l’accueil : gardé sur cet iPhone (l’accès est propre à chaque appareil). */
const DECLINED_KEY = 'flair.mouvements-non'

export function motionDeclined(): boolean {
  try {
    return localStorage.getItem(DECLINED_KEY) === '1'
  } catch {
    return false
  }
}

export function declineMotion(): void {
  try {
    localStorage.setItem(DECLINED_KEY, '1')
  } catch {
    // Stockage indisponible : l’invitation reviendra à la prochaine ouverture.
  }
  window.dispatchEvent(new Event('flair:mouvements'))
}

/** « Non » sur une marche : elle ne revient plus (compte, champ optionnel `motion.dismissed`). */
export function dismissMotionPeriod(id: string, dismissed: string[]): void {
  send(setDoc(accountDoc(), { motion: { dismissed: [...keptDismissed(dismissed, new Date()), id] } }, { merge: true }))
}

/**
 * L’état de l’accès et les marches des 7 derniers jours, relus à l’ouverture et au retour au premier plan.
 * `ask()` pose la question d’iOS (une seule fois : ensuite, iOS répond sans rien montrer).
 */
export function useMotion() {
  const [status, setStatus] = useState<MotionStatus | 'unavailable'>()
  const [periods, setPeriods] = useState<MotionPeriod[]>([])

  const refresh = useCallback(async () => {
    const next = await motionStatus()
    setStatus(next)
    if (next === 'granted') setPeriods(await readMotionWalks(new Date(`${addDays(todayISO(), -(LOOKBACK_DAYS - 1))}T00:00:00`).toISOString()))
  }, [])

  useEffect(() => {
    if (!isNative()) return
    void refresh()
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('flair:mouvements', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('flair:mouvements', onVisible)
    }
  }, [refresh])

  const ask = useCallback(async () => {
    // Une première lecture suffit à faire poser la question par iOS ; tous les écrans relisent ensuite.
    await readMotionWalks(new Date(Date.now() - 3_600_000).toISOString())
    window.dispatchEvent(new Event('flair:mouvements'))
  }, [])

  return { status, periods, ask }
}
