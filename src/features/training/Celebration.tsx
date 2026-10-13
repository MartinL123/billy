import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { StarIcon } from '../../components/Icons'
import type { Boss } from '../../content/training'
import { XP } from '../../lib/xp'

/** Célébration courte d'un palier acquis. La carte souvenir est déjà dans le Journal. */
export function Celebration({ boss, level, onClose }: { boss: Boss; level: number; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
  const info = boss.levels[level - 1]
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Palier acquis"
      className="fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center gap-4 bg-primary px-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center text-white"
    >
      <span className="flex size-24 items-center justify-center rounded-full bg-[#F4C27A] text-primary-dark">
        <StarIcon size={48} />
      </span>
      <p className="text-[15px] font-bold tracking-[0.6px] uppercase opacity-85">Palier acquis</p>
      <h1 className="font-display text-[34px] leading-tight font-bold">{boss.name}</h1>
      <p className="font-display text-2xl font-bold">
        P{level} · {info?.title}
      </p>
      <p className="text-base leading-snug opacity-90">{info?.criterion}</p>
      <p className="rounded-full bg-white/15 px-4 py-2 text-base font-bold">+{XP.level} XP · acquis pour toujours</p>
      <p className="text-sm opacity-85">Une carte souvenir est ajoutée au Journal.</p>
      <button type="button" onClick={onClose} className="mt-4 h-[54px] w-full max-w-[320px] rounded-full border-0 bg-white text-[17px] font-bold text-primary-dark">
        Continuer
      </button>
    </div>,
    document.body,
  )
}
