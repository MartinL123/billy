import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { stepPhraseLower } from '../../content/phrases'
import { Badge } from '../billy/Badge'
import { bossById, MAX_LEVEL } from '../../content/training'

/** Plein écran sobre (T-072 : ni confettis ni pluie d’os) ; « Continuer » ferme. */
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
      className="fixed inset-0 z-50 flex flex-col items-center overflow-x-hidden overflow-y-auto bg-primary-dark px-7 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+32px)] text-center text-white"
    >
      {children}
    </div>,
    document.body,
  )
}

const continueButton = 'mt-auto flex min-h-[60px] w-full shrink-0 items-center justify-center rounded-full border-0 bg-gold text-[1.1176rem] font-bold text-gold-dark'
const pill = 'rounded-2xl bg-white/15 px-3.5 py-2 text-base font-bold'

/** Nouvelle étape : « C’est réussi ! », la phrase de l’étape en grand, la suivante. Ni étoile ni compteur. */
export function StepSuccess({ dogName, bossId, level, inCarnet = true, onClose }: { dogName: string; bossId: string; level: number; inCarnet?: boolean; onClose: () => void }) {
  const boss = bossById(bossId)
  return (
    <FullScreen label="C’est réussi">
      <span className="flex size-40 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
        <Badge bossId={bossId} acquired={level} size={136} lit="#F2B544" />
      </span>
      <div className="flex w-full flex-1 flex-col items-center">
        <p className="mt-7 text-[0.8824rem] font-bold tracking-[1px] text-[#F7D58A] uppercase">C’est réussi ! · {boss?.name}</p>
        <h1 className="title-screen mt-3">
          {dogName} {stepPhraseLower(bossId, level)}
        </h1>
        {level < MAX_LEVEL && (
          <div className="mt-6 flex w-full flex-col gap-1 rounded-[18px] bg-white/10 px-4 py-3.5 text-left">
            <span className="text-[#F7D58A] surtitre">Prochaine étape</span>
            <span className="text-[1rem] leading-snug">{stepPhraseLower(bossId, level + 1).replace(/^./, (c) => c.toLocaleUpperCase('fr'))}</span>
          </div>
        )}
        <div className="mt-4 mb-6 flex flex-wrap justify-center gap-2.5">
          <span className={pill}>▲ {boss?.name} avance</span>
          {inCarnet && <span className={pill}>Ajouté au Carnet</span>}
        </div>
        <button type="button" onClick={onClose} className={continueButton}>
          Continuer
        </button>
      </div>
    </FullScreen>
  )
}
