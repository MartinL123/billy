import { setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { canPush, deviceRef, disablePush, enablePush, isInstalled, readPush } from '../../firebase/push'
import { DEFAULT_REMINDER_TIME } from '../../lib/reminder'

/**
 * Rappel du soir : une notification pour remplir le carnet, envoyée par une tâche planifiée (aucun serveur payant).
 * Désactivé par défaut. La permission est demandée au toucher de l'interrupteur, comme l'exige l'iPhone.
 */
export function EveningReminder({ dogName }: { dogName: string }) {
  const [enabled, setEnabled] = useState(false)
  const [time, setTime] = useState(DEFAULT_REMINDER_TIME)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    readPush()
      .then((push) => {
        if (!alive) return
        setEnabled(push.evening)
        setTime(push.time ?? DEFAULT_REMINDER_TIME)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const turnOn = async () => {
    const error = await enablePush('evening', { time })
    if (error) return setMessage(error)
    setEnabled(true)
    setMessage(`C'est noté : un rappel chaque soir vers ${time.replace(':', ' h ')}, sauf si vous avez déjà noté quelque chose.`)
  }

  const turnOff = async () => {
    await disablePush('evening')
    setEnabled(false)
    setMessage('Rappel du soir désactivé.')
  }

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await (enabled ? turnOff() : turnOn())
    } catch {
      setMessage('Le rappel n’a pas pu être modifié. Vérifiez votre connexion et réessayez.')
    }
    setBusy(false)
  }

  const changeTime = (next: string) => {
    setTime(next)
    if (enabled && /^\d{2}:\d{2}$/.test(next)) void setDoc(deviceRef(), { time: next }, { merge: true }).catch(() => undefined)
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xl font-bold">Rappel du soir</h2>
      <div className="card flex flex-col gap-3 p-4">
        {!canPush() ? (
          <p className="text-[17px] leading-snug text-muted">Le rappel du soir n'est pas disponible sur cet appareil.</p>
        ) : !isInstalled() ? (
          <>
            <p className="text-[17px] leading-snug">Pour recevoir un rappel chaque soir, installez d'abord l'app sur l'écran d'accueil :</p>
            <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-[17px] leading-snug">
              <li>Ouvrez cette page dans Safari.</li>
              <li>Touchez le bouton Partager.</li>
              <li>Choisissez « Sur l'écran d'accueil ».</li>
            </ol>
          </>
        ) : (
          <>
            <label className="flex min-h-12 items-center gap-3.5">
              <input type="checkbox" role="switch" checked={enabled} disabled={busy} onChange={() => void toggle()} className="size-7 shrink-0 accent-primary" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[17px] font-bold">Me rappeler de noter la journée</span>
                <span className="text-[15px] text-muted">Une notification le soir, jamais si c'est déjà noté</span>
              </span>
            </label>
            <label className="flex items-center justify-between gap-3 border-t border-divider pt-3">
              <span className="text-[17px] font-semibold">Heure du rappel</span>
              <input type="time" value={time} onChange={(e) => changeTime(e.target.value)} className="field min-h-12 w-[130px] px-3 text-[17px]" />
            </label>
            <p className="text-[13px] leading-snug text-muted">Elle peut arriver avec quelques minutes de retard. « Comment s'est passée la journée avec {dogName} ? »</p>
          </>
        )}
        {message && (
          <p role="status" className="text-[15px] leading-snug text-primary-dark">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
