import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { SKILLS, territoryOf } from '../../content/phrases'
import { BossIcon } from '../training/BossIcon'
import { SkillPath } from './Skill'

/**
 * « Pour : Le Rappel » : une pastille-bouton qui ouvre le chemin de la compétence par-dessus l'écran en cours.
 * L'écran d'origine reste en place derrière : au retour, rien de ce qui était saisi n'est perdu.
 */
export function SkillPill({ bossId, onDark = false }: { bossId: string; onDark?: boolean }) {
  const [open, setOpen] = useState(false)
  const skill = SKILLS.find((s) => s.id === bossId)
  const territory = territoryOf(bossId)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!skill) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Pour : ${skill.name}. Voir son chemin`}
        className="flex min-h-12 max-w-full items-center gap-2 self-start rounded-full border-2 border-solid px-3.5 text-left text-[15px] font-bold"
        style={onDark ? { background: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.6)', color: '#FFFFFF' } : { background: territory.soft, borderColor: territory.color, color: territory.color }}
      >
        <BossIcon bossId={bossId} size={18} />
        <span className="truncate">Pour : {skill.name}</span>
        <ChevronRightIcon size={18} className="shrink-0" />
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={`Le chemin : ${skill.name}`} className="fixed inset-0 z-30 animate-fade overflow-y-auto bg-bg">
            <SkillPath id={bossId} onBack={() => setOpen(false)} overlay />
          </div>,
          document.body,
        )}
    </>
  )
}
