import { useEffect, useState } from 'react'
import { NativePickerInput, SWITCH } from '../../components/Form'
import { updateDog } from '../../firebase/db'
import { canPush, disablePush, enablePush, isInstalled, readPush } from '../../firebase/push'
import { useData } from '../../firebase/store'
import { WALK_SLOTS, walkTimes, type WalkSlot } from '../../lib/walks'

/** Profil › Sorties : les heures des 3 sorties du jour et la notification à l’heure de chacune. */
export function WalkSettings() {
  const { dog } = useData()
  const times = walkTimes(dog.walkTimes)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    readPush()
      .then((push) => alive && setEnabled(push.walks))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const changeTime = (slot: WalkSlot, value: string) => {
    if (/^\d{2}:\d{2}$/.test(value)) updateDog({ walkTimes: { ...times, [slot]: value } })
  }

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      if (enabled) {
        await disablePush('walks')
        setEnabled(false)
        setMessage('Rappels de sortie désactivés.')
      } else {
        const error = await enablePush('walks')
        if (error) setMessage(error)
        else {
          setEnabled(true)
          setMessage("C’est noté : une notification à l’heure de chaque sortie, sauf si elle est déjà cochée.")
        }
      }
    } catch {
      setMessage('Le rappel n’a pas pu être modifié. Vérifiez votre connexion et réessayez.')
    }
    setBusy(false)
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xl font-bold">Sorties</h2>
      <div className="card flex flex-col gap-3 p-4">
        <p className="text-[0.8824rem] leading-snug text-muted">3 sorties par jour. Elles se cochent toutes seules avec vos balades Strava.</p>
        {WALK_SLOTS.map((slot) => (
          <label key={slot.id} className="flex items-center justify-between gap-3 border-t border-divider pt-3">
            <span className="text-[1rem] font-semibold">{slot.label}</span>
            <NativePickerInput type="time" value={times[slot.id]} onChange={(e) => changeTime(slot.id, e.target.value)} className="field min-h-12 w-[130px] px-3 text-[1rem]" />
          </label>
        ))}
        {canPush() && isInstalled() && (
          <label className="flex min-h-12 items-center justify-between gap-3.5 border-t border-divider pt-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-[1rem] font-bold">Me prévenir à l’heure des sorties</span>
              <span className="text-[0.8824rem] text-muted">Jamais si la sortie est déjà cochée</span>
            </span>
            <input type="checkbox" role="switch" {...SWITCH} checked={enabled} disabled={busy} onChange={() => void toggle()} className="shrink-0 accent-primary" />
          </label>
        )}
        {message && (
          <p role="status" className="text-[0.8824rem] leading-snug text-primary-dark">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
