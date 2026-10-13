import { useNavigate } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { CalendarIcon, DocumentIcon, NoteIcon, PhotoIcon, TargetIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { declareRest } from '../../firebase/training'
import { weekOf } from '../../lib/rhythm'
import { useToday } from '../../lib/useToday'
import { restXp } from '../../lib/xp'
import { setDraftPhotos } from '../journal/draft'

/** Le « + » : raconter d'abord, puis faire un exercice, puis le reste. */
export function QuickAdd({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { xpLog } = useData()
  const today = useToday()
  const toast = useToast()
  const go = (to: string) => {
    onClose()
    navigate(to)
  }
  const rested = xpLog.some((e) => e.id === `repos-${today}`)
  const rest = () => {
    const xp = restXp(xpLog, weekOf(today))
    const { undo } = declareRest(today, false, xp)
    onClose()
    toast(`Jour de repos noté${xp ? ` · +${xp} XP` : ''}`, { label: 'Annuler', run: undo })
  }
  const other = 'btn btn-quiet w-full justify-start gap-3 px-4'

  return (
    <Sheet label="Ajouter" onClose={onClose}>
      <h2 className="my-1 font-display text-2xl font-bold">Ajouter</h2>

      <button type="button" onClick={() => go('/raconter')} className="btn btn-main min-h-16 w-full text-[19px]">
        <NoteIcon size={24} />
        Raconter ce qu'on a fait
      </button>
      <button type="button" onClick={() => go('/exercice')} className="btn btn-outline min-h-14 w-full">
        <TargetIcon size={22} />
        Faire un exercice
      </button>

      <h3 className="mt-2 text-[15px] font-bold tracking-[0.5px] text-muted uppercase">Autre</h3>
      {/* « Photos » ouvre la photothèque, puis « Raconter un moment » avec les photos choisies. */}
      <FilePicker
        accept="image/*"
        onFiles={(files) => {
          setDraftPhotos(files)
          go('/raconter')
        }}
        className={other}
      >
        <PhotoIcon size={22} />
        Photos
      </FilePicker>
      <button type="button" onClick={() => go('/evenement/nouveau')} className={other}>
        <CalendarIcon size={22} />
        Rendez-vous ou soin
      </button>
      <button type="button" onClick={() => go('/document/nouveau')} className={other}>
        <DocumentIcon size={22} />
        Document
      </button>
      <button type="button" disabled={rested} onClick={rest} className={`${other} disabled:opacity-50`}>
        {rested ? 'Jour de repos déjà noté' : 'Jour de repos'}
      </button>
    </Sheet>
  )
}
