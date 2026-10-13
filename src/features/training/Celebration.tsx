import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FileImage } from '../../components/FileImage'
import { CheckIcon } from '../../components/Icons'
import { levelTitle, stepPhraseLower } from '../../content/phrases'
import { bossById, MAX_LEVEL } from '../../content/training'
import { MOMENT_XP } from '../../lib/moment'

function FullScreen({ label, children }: { label: string; children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex animate-fade flex-col items-center overflow-y-auto bg-primary-dark px-7 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+32px)] text-center text-white"
    >
      {children}
    </div>,
    document.body,
  )
}

const continueButton = 'mt-auto flex min-h-[60px] w-full shrink-0 items-center justify-center rounded-full border-0 bg-gold text-[19px] font-extrabold text-gold-dark'
const pill = 'rounded-2xl bg-white/15 px-3.5 py-2 text-base font-bold'

/** Nouvelle étape : « C'est réussi ! », la phrase de l'étape en grand, la suivante. Ni étoile ni compteur. */
export function StepSuccess({ dogName, bossId, level, onClose }: { dogName: string; bossId: string; level: number; onClose: () => void }) {
  const boss = bossById(bossId)
  return (
    <FullScreen label="C'est réussi">
      <span className="flex size-40 shrink-0 animate-rise items-center justify-center rounded-full bg-[rgba(242,181,68,0.16)]">
        <span className="flex size-28 items-center justify-center rounded-full bg-gold text-gold-dark">
          <CheckIcon size={56} strokeWidth={3} />
        </span>
      </span>
      <p className="mt-7 text-[15px] font-bold tracking-[1px] text-[#F7D58A] uppercase">C'est réussi ! · {boss?.name}</p>
      <h1 className="mt-3 font-display text-[30px] leading-tight font-extrabold">
        {dogName} {stepPhraseLower(bossId, level)}
      </h1>
      {level < MAX_LEVEL && (
        <div className="mt-6 flex w-full flex-col gap-1 rounded-[18px] bg-white/10 px-4 py-3.5 text-left">
          <span className="text-[13px] font-bold tracking-[0.6px] text-[#F7D58A] uppercase">Prochaine étape</span>
          <span className="text-[17px] leading-snug">{stepPhraseLower(bossId, level + 1).replace(/^./, (c) => c.toLocaleUpperCase('fr'))}</span>
        </div>
      )}
      <div className="mt-4 mb-6 flex flex-wrap justify-center gap-2.5">
        <span className={pill}>+{MOMENT_XP.step} XP</span>
        <span className={pill}>Ajouté au Carnet</span>
      </div>
      <button type="button" onClick={onClose} className={continueButton}>
        Continuer
      </button>
    </FullScreen>
  )
}

/** Nouveau niveau : la photo de Billy, son nouveau titre. */
export function LevelUp({ dogName, level, photoFileId, onClose }: { dogName: string; level: number; photoFileId?: string; onClose: () => void }) {
  return (
    <FullScreen label="Nouveau niveau">
      <span className="flex size-44 shrink-0 animate-rise items-center justify-center rounded-full border-[6px] border-solid border-gold bg-white/10">
        {photoFileId ? (
          <FileImage fileId={photoFileId} alt="" className="size-full rounded-full" eager />
        ) : (
          <span className="font-display text-7xl font-extrabold">{dogName.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <p className="mt-7 text-[15px] font-bold tracking-[1px] text-[#F7D58A] uppercase">Nouveau niveau</p>
      <h1 className="mt-3 font-display text-[40px] leading-tight font-extrabold">Niveau {level} !</h1>
      <p className="mt-2 text-xl leading-snug">
        {dogName} devient <span className="font-bold text-[#F7D58A]">{levelTitle(level)}</span>
      </p>
      <div className="mt-5 mb-6 flex justify-center">
        <span className={pill}>Ajouté au Carnet</span>
      </div>
      <button type="button" onClick={onClose} className={continueButton}>
        Continuer
      </button>
    </FullScreen>
  )
}
