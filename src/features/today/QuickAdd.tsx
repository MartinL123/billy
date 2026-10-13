import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { CalendarIcon, DocumentIcon, NoteIcon, PhotoIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { setDraftPhotos } from '../journal/draft'

const rowClass = 'flex w-full items-center gap-4 rounded-[20px] border-0 bg-bg p-4 text-left text-text'

function RowContent({ icon, tone, title, detail }: { icon: ReactNode; tone: string; title: string; detail: string }) {
  return (
    <>
      <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-2xl ${tone}`}>{icon}</span>
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

      {/* « Photos » ouvre directement la photothèque, puis le formulaire d'entrée. */}
      <FilePicker
        accept="image/*"
        onFiles={(files) => {
          setDraftPhotos(files)
          go('/souvenir/nouveau')
        }}
        className={rowClass}
      >
        <RowContent icon={<PhotoIcon size={26} />} tone="bg-primary text-white" title="Photos" detail="Depuis ta photothèque" />
      </FilePicker>

      <button type="button" onClick={() => go('/souvenir/nouveau')} className={rowClass}>
        <RowContent icon={<NoteIcon size={26} />} tone="bg-milestone-soft text-milestone-dark" title="Note" detail="Un progrès, une bêtise, un ressenti" />
      </button>

      <button type="button" onClick={() => go('/evenement/nouveau')} className={rowClass}>
        <RowContent icon={<CalendarIcon size={26} />} tone="bg-info-soft text-info" title="Événement" detail="Vaccin, véto, séance, séjour…" />
      </button>

      <button type="button" onClick={() => go('/document/nouveau')} className={rowClass}>
        <RowContent icon={<DocumentIcon size={26} />} tone="bg-[#F6E3E1] text-[#9A2F28]" title="Document" detail="PDF ou photos de pages" />
      </button>

      <button type="button" onClick={onClose} className="mt-1 h-[52px] rounded-full border-[1.5px] border-border bg-surface text-base font-semibold text-text">
        Annuler
      </button>
    </Sheet>
  )
}
