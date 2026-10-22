import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NativePickerInput } from '../../components/Form'
import { Sheet } from '../../components/Sheet'
import { newId, saveEvent } from '../../firebase/db'
import { addDays, isValidISO, type ISODate } from '../../lib/dates'
import { EVENT_TYPES, type EventType } from '../../lib/events'
import { useToday } from '../../lib/useToday'
import { isNative } from '../../native'
import { askNotificationPermission } from '../notifications/localNotifications'

type Choice = EventType | 'pesee'

const TILES: { id: Choice; label: string; color: string }[] = [
  { id: 'vaccin', label: 'Vaccin', color: EVENT_TYPES.vaccin.color },
  { id: 'vermifuge', label: 'Vermifuge', color: EVENT_TYPES.vermifuge.color },
  { id: 'antiparasitaire', label: 'Antiparasitaire', color: EVENT_TYPES.antiparasitaire.color },
  { id: 'veto', label: 'Rendez-vous véto', color: EVENT_TYPES.veto.color },
  { id: 'pesee', label: 'Pesée', color: '#1E5A50' },
  { id: 'autre', label: 'Autre', color: EVENT_TYPES.autre.color },
]

/**
 * « + Ajouter un soin ou un RDV » (V5, T-053) en 2 temps : « Qu’ajoutez-vous ? » (6 grandes tuiles), puis « Quand ? »
 * (Aujourd’hui, Demain, Autre jour). L’heure, la note et la répétition se modifient ensuite dans l’événement.
 */
export function AddCareSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const today = useToday()
  const navigate = useNavigate()
  const [type, setType] = useState<EventType>()
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'other'>('today')
  const [other, setOther] = useState('')
  const date: ISODate = when === 'today' ? today : when === 'tomorrow' ? addDays(today, 1) : other

  const pick = (choice: Choice) => {
    // Une pesée a son propre écran ; « Autre » a besoin d’un titre : le formulaire complet.
    if (choice === 'pesee') return navigate('/sante/poids?ajouter=1')
    if (choice === 'autre') return navigate('/evenement/nouveau?type=autre')
    setType(choice)
  }

  const save = () => {
    if (!type || !isValidISO(date)) return
    const id = newId('events')
    saveEvent(id, { title: EVENT_TYPES[type].title, type, date, recurrence: EVENT_TYPES[type].recurrence, done: false })
    if (isNative()) askNotificationPermission().catch(() => undefined)
    onSaved(id)
    onClose()
  }

  const option = (on: boolean) => `tap min-h-[52px] rounded-field border-2 border-solid text-[0.9412rem] font-bold ${on ? 'border-primary bg-primary-soft text-primary-dark' : 'border-line-strong bg-surface text-text'}`
  return (
    <Sheet label={type ? 'Quand\u00a0?' : 'Qu’ajoutez-vous\u00a0?'} onClose={onClose}>
      {!type ? (
        <>
          <h2 className="title-section mt-1">Qu’ajoutez-vous ?</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {TILES.map((tile) => (
              <button key={tile.id} type="button" onClick={() => pick(tile.id)} className="tap flex min-h-[72px] items-center gap-2.5 rounded-field border-2 border-solid border-divider bg-surface px-3.5 text-left text-[0.9412rem] font-bold text-text">
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: tile.color }} />
                {tile.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <span className="text-milestone-dark surtitre">{EVENT_TYPES[type].title}</span>
          <h2 className="title-section">Quand ?</h2>
          <div role="radiogroup" aria-label="Quand" className="grid grid-cols-3 gap-2.5">
            <button type="button" role="radio" aria-checked={when === 'today'} onClick={() => setWhen('today')} className={option(when === 'today')}>
              Aujourd’hui
            </button>
            <button type="button" role="radio" aria-checked={when === 'tomorrow'} onClick={() => setWhen('tomorrow')} className={option(when === 'tomorrow')}>
              Demain
            </button>
            <button type="button" role="radio" aria-checked={when === 'other'} onClick={() => setWhen('other')} className={option(when === 'other')}>
              Autre jour
            </button>
          </div>
          {when === 'other' && <NativePickerInput type="date" aria-label="Le jour" value={other} onChange={(e) => setOther(e.target.value)} className="field min-h-12 px-3.5 text-[1rem]" />}
          <button type="button" onClick={save} disabled={!isValidISO(date)} className="btn btn-main min-h-14">
            Enregistrer
          </button>
          <button type="button" onClick={() => setType(undefined)} className="btn-text self-center px-4">
            Choisir autre chose
          </button>
        </>
      )}
    </Sheet>
  )
}
