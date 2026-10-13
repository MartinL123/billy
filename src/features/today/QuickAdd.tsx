import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { CalendarIcon, DocumentIcon, InfoIcon, NoteIcon, PhotoIcon, TargetIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { setDraftPhotos } from '../journal/draft'

const rowClass = 'flex w-full items-center gap-3.5 rounded-[20px] border-0 bg-bg px-4 py-2.5 text-left text-text'

function RowContent({ icon, tone, title, detail }: { icon: ReactNode; tone: string; title: string; detail: string }) {
  return (
    <>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[17px] font-bold">{title}</span>
        <span className="text-sm text-muted">{detail}</span>
      </span>
    </>
  )
}

/** Feuille d'ajout rapide : tout s'ajoute en 2 taps depuis l'accueil. */
export function QuickAdd({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <Sheet label="Ajouter" onClose={onClose}>
      <h2 className="my-1 font-display text-2xl font-bold">Ajouter</h2>

      <button type="button" onClick={() => go('/seance')} className={rowClass}>
        <RowContent icon={<TargetIcon size={26} />} tone="bg-primary-soft text-primary-dark" title="Séance" detail="5 essais sur un exercice de dressage" />
      </button>

      <button type="button" onClick={() => go('/exposition')} className={rowClass}>
        <RowContent icon={<InfoIcon size={26} />} tone="bg-milestone-soft text-milestone-dark" title="Exposition" detail="Un déclencheur croisé, voulu ou subi" />
      </button>

      {/* « Photos » ouvre directement la photothèque, puis le formulaire d'entrée. */}
      <FilePicker
        accept="image/*"
        onFiles={(files) => {
          setDraftPhotos(files)
          go('/raconter')
        }}
        className={rowClass}
      >
        <RowContent icon={<PhotoIcon size={26} />} tone="bg-primary text-white" title="Photos" detail="Depuis ta photothèque" />
      </FilePicker>

      <button type="button" onClick={() => go('/raconter')} className={rowClass}>
        <RowContent icon={<NoteIcon size={26} />} tone="bg-[#EEF0EE] text-[#3F4946]" title="Note" detail="Un progrès, une bêtise, un ressenti" />
      </button>

      <button type="button" onClick={() => go('/evenement/nouveau')} className={rowClass}>
        <RowContent icon={<CalendarIcon size={26} />} tone="bg-info-soft text-info" title="Événement" detail="Vaccin, véto, séance, séjour…" />
      </button>

      <button type="button" onClick={() => go('/document/nouveau')} className={rowClass}>
        <RowContent icon={<DocumentIcon size={26} />} tone="bg-[#F6E3E1] text-[#9A2F28]" title="Document" detail="PDF ou photos de pages" />
      </button>

      <button type="button" onClick={onClose} className="btn btn-quiet mt-1">
        Annuler
      </button>
    </Sheet>
  )
}
