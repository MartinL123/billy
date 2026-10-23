import { useState, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { ConfirmSheet } from '../../components/Sheet'
import { removeNotedWalk } from '../../firebase/imports'
import { useData } from '../../firebase/store'
import { useReadOnly } from '../../firebase/viewer'
import { formatDuration } from '../../lib/balade'
import { formatDayHeading } from '../../lib/dates'
import { dogName } from '../../lib/dogName'
import { outingAbout, outingName, type NotedOuting } from '../../lib/notedOutings'
import { walkTimes } from '../../lib/walks'
import { NoteSheet } from '../today/WalkDayCard'

/**
 * R-095 : la petite fiche d’une sortie notée sans trajet (« Combien de temps ? »), dans le panneau de la carte :
 * « Sortie du matin », « 35 min avec Billy », le jour et l’heure du créneau, l’encadré qui dit pourquoi il n’y a pas de
 * carte, « Un mot ? », puis « Modifier la durée » · « Supprimer ». Aucun bloc vide.
 */
export function OutingSheet({ outing, backLabel, onBack, onDeleted, peekRef }: { outing: NotedOuting; backLabel: string; onBack: () => void; onDeleted: () => void; peekRef: Ref<HTMLDivElement> }) {
  const { dog } = useData()
  const readOnly = useReadOnly()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const name = outingName(outing.slot)
  const time = outing.time ?? walkTimes(dog.walkTimes)[outing.slot]

  return (
    <>
      <div className="flex flex-col gap-3">
        <BackLink label={backLabel} onClick={onBack} className="-mt-1 -mb-2" />
        <div ref={peekRef} className="flex flex-col gap-1">
          <span className="surtitre text-primary">{name}</span>
          <h1 className="title-screen">
            {formatDuration(outing.minutes)} avec {dogName(dog)}
          </h1>
          <p className="text-[1rem] leading-snug text-muted">{[formatDayHeading(outing.date), outingAbout(outing)].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-1">
        <p className="m-0 rounded-card border-[1.5px] border-dashed border-line-strong px-3.5 py-3 text-[0.8824rem] leading-snug text-[#3F4946]">
          Pas de trajet pour cette sortie{' '}: elle a été notée sans GPS. La carte reste sur toutes les balades.
        </p>
        {!readOnly && (
          <section className="card flex flex-col gap-1 p-4">
            <h2 className="title-section">Un mot{' '}?</h2>
            {/* Un souvenir du jour (photo, note) : il apparaît à côté de la sortie dans le journal. */}
            <Link to="/noter" className="btn-text -ml-1 self-start">
              Ajouter un mot ou une photo
            </Link>
          </section>
        )}
        {!readOnly && (
          <div className="-ml-1 flex flex-wrap gap-x-5">
            <button type="button" onClick={() => setEditing(true)} className="btn-text">
              Modifier la durée
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-text text-danger">
              Supprimer
            </button>
          </div>
        )}
      </div>

      {editing && <NoteSheet walk={{ date: outing.date, slot: outing.slot, time, name, minutes: outing.minutes }} onClose={() => setEditing(false)} />}
      {confirmDelete && (
        <ConfirmSheet
          title={'Supprimer cette sortie\u00a0?'}
          message="Elle redevient à noter. Les os déjà gagnés restent."
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            removeNotedWalk(outing.date, outing.slot)
            setConfirmDelete(false)
            onDeleted()
          }}
        />
      )}
    </>
  )
}
