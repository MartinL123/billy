import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { inkOn, stepName, stepPhrase, territoryOf } from '../../content/phrases'
import { bossById, MAX_LEVEL } from '../../content/training'
import { pathProgress } from '../../lib/billyPage'
import { placeSkill } from '../../lib/garden'
import { pawsLabel, skillPaws, type PawState } from '../../lib/skillPaws'

function Star({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
    </svg>
  )
}

/** Un point du chemin : vert coché = acquise, orange avec halo = en cours, gris = à venir ; l’étoile sur le dernier. */
function Point({ state, last }: { state: PawState; last: boolean }) {
  if (state === 'acquise')
    return (
      <span className="flex size-[26px] items-center justify-center rounded-full bg-primary text-white">
        {last ? (
          <Star size={13} />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
    )
  if (state === 'en-cours') return <span className="flex size-[26px] items-center justify-center rounded-full bg-action text-white shadow-[0_0_0_4px_var(--color-milestone-soft)]">{last && <Star size={13} />}</span>
  return <span className="flex size-[26px] items-center justify-center rounded-full border-2 border-solid border-border bg-surface text-[#8A6514]">{last && <Star size={13} />}</span>
}

/** Le chemin de 5 points reliés, le nom court de chaque étape dessous, toujours sur une ligne. */
export function StepPath({ bossId, level }: { bossId: string; level: number }) {
  const states = skillPaws(level)
  return (
    <span role="img" aria-label={pawsLabel(level)} className="relative grid grid-cols-5">
      {/* Le trait relie le centre du premier point à celui du dernier (10 % à 90 %), vert jusqu’à l’étape en cours. */}
      <span aria-hidden="true" className="absolute top-[11.5px] right-[10%] left-[10%] h-[3px] bg-divider" />
      <span aria-hidden="true" className="absolute top-[11.5px] left-[10%] h-[3px] bg-primary" style={{ width: `${pathProgress(level) * 80}%` }} />
      {states.map((state, i) => (
        <span key={i} aria-hidden="true" className="relative flex min-w-0 flex-col items-center gap-1">
          <Point state={state} last={i === MAX_LEVEL - 1} />
          <span className={`block max-w-full truncate px-0.5 text-center text-[0.6471rem] leading-tight ${state === 'en-cours' ? 'font-bold text-text' : 'font-medium text-muted'}`}>{stepName(bossId, i + 1)}</span>
        </span>
      ))}
    </span>
  )
}

/**
 * Une compétence en cours (T-104) : sa phrase, la pastille de son territoire, son chemin.
 * Ouverte (bord vert) : « Prochaine étape » et sa phrase complète, qui mène à la compétence. Jamais les 3 jours de réussite.
 */
export function LearningCard({ bossId, level, open, onToggle }: { bossId: string; level: number; open: boolean; onToggle: () => void }) {
  const boss = bossById(bossId)
  const territory = territoryOf(bossId)
  const goal = placeSkill((boss?.goal ?? '').replace(/\.$/, ''))
  const next = level < MAX_LEVEL ? stepPhrase(bossId, level + 1) : ''
  return (
    <div className={`card flex flex-col gap-3 rounded-[20px] p-4 ${open ? 'shadow-[inset_0_0_0_2px_var(--color-primary),var(--shadow-card)]' : ''}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="tap flex flex-col items-stretch gap-3 border-0 bg-transparent p-0 text-left text-text">
        <span className="flex items-start justify-between gap-2">
          <span className="title-card">{goal}</span>
          <span className="shrink-0 rounded-full px-2 py-[3px] text-[0.7059rem] leading-tight font-bold whitespace-nowrap" style={{ background: territory.soft, color: inkOn(territory) }}>
            {boss?.name}
          </span>
        </span>
        <StepPath bossId={bossId} level={level} />
      </button>
      {open && (
        <Link to={`/competence/${bossId}`} className="tap anim-in flex items-center gap-2 rounded-[12px] bg-bg px-3 py-2.5 text-text no-underline">
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="surtitre text-primary">{next ? 'Prochaine étape' : 'Tout est acquis'}</span>
            <span className="text-[0.8235rem] leading-snug">{next ? `${next}.` : 'Voir tout son chemin'}</span>
          </span>
          <ChevronRightIcon size={18} className="shrink-0 text-muted" />
        </Link>
      )}
    </div>
  )
}
