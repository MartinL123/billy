import { useState } from 'react'
import { SWITCH } from '../../components/Form'
import { updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { photosAccess } from '../../native/flair'
import { APP_NAME } from '../../appName'

/**
 * Profil, app iOS (T-103) : « Retrouver les photos de mes balades ». Allumé : l’accès Photos d’iOS est demandé (une
 * fois ; limité ou complet) ; refusé, l’interrupteur reste éteint et la phrase dessous dit où l’activer.
 */
export function WalkPhotosSetting() {
  const { dog } = useData()
  const [denied, setDenied] = useState(false)
  const on = dog.walkPhotos === true

  const toggle = async () => {
    if (on) return updateDog({ walkPhotos: false })
    const status = await photosAccess(true)
    if (status === 'unavailable') return
    const ok = status === 'granted' || status === 'limited'
    setDenied(!ok)
    if (ok) updateDog({ walkPhotos: true })
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="title-section">Photos des balades</h2>
      <div className="card flex flex-col p-4">
        <label className="flex min-h-14 items-center justify-between gap-3.5 py-1">
          <span className="flex flex-col gap-0.5">
            <span className="text-[1rem] font-bold">Retrouver les photos de mes balades</span>
            <span className="text-[0.8824rem] leading-snug text-muted">Les photos prises pendant une balade s’ajoutent à son souvenir. Rien n’est partagé.</span>
          </span>
          <input type="checkbox" role="switch" {...SWITCH} checked={on} onChange={() => void toggle()} className="shrink-0 accent-primary" />
        </label>
        {denied && (
          <p role="status" className="mt-2 text-[0.8824rem] leading-snug text-primary-dark">
            {`L’accès aux photos est refusé. Pour l’activer : Réglages › ${APP_NAME} › Photos.`}
          </p>
        )}
      </div>
    </section>
  )
}
