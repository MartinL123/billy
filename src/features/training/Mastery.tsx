import { CheckIcon } from '../../components/Icons'
import { SUCCESSES_TO_PASS, type Progress, type SessionResult, type Trend } from '../../lib/training'

const BAR: Record<SessionResult, { height: number; color: string; label: string }> = {
  difficile: { height: 8, color: '#D9661F', label: 'difficile' },
  moyen: { height: 15, color: '#2F6FD0', label: 'ça vient' },
  reussi: { height: 22, color: '#1E5A50', label: 'réussi' },
}

export const TREND_LABEL: Record<Trend, { text: string; tone: string }> = {
  mieux: { text: '↗ En progrès', tone: 'text-primary' },
  stable: { text: '→ Stable', tone: 'text-muted' },
  'moins-bien': { text: '↘ En baisse', tone: 'text-danger' },
}

/** Les dernières séances d'un ordre : une barre par séance, plus haute quand c'est mieux réussi. */
export function MasteryBars({ recent, className = '' }: { recent: SessionResult[]; className?: string }) {
  if (recent.length === 0) return null
  return (
    <span
      role="img"
      aria-label={`${recent.length} dernières séances : ${recent.map((r) => BAR[r].label).join(', ')}`}
      className={`flex h-[22px] shrink-0 items-end gap-[3px] ${className}`}
    >
      {recent.map((result, i) => (
        <span key={i} className="w-[5px] rounded-full" style={{ height: BAR[result].height, background: BAR[result].color }} />
      ))}
    </span>
  )
}

/** « Palier 2 sur 5 », ou « Entretien » une fois tous les paliers validés. */
export const levelLabel = (p: Progress) => (p.maintenance ? 'Entretien' : `Palier ${p.level} sur ${p.total}`)

/** Les réussites du palier en cours : 3 ronds à remplir. */
export function Pips({ progress }: { progress: Progress }) {
  if (progress.maintenance) return null
  return (
    <span className="flex items-center gap-1.5" role="img" aria-label={`${progress.successes} réussites sur ${SUCCESSES_TO_PASS} pour valider le palier`}>
      {Array.from({ length: SUCCESSES_TO_PASS }, (_, i) => (
        <span
          key={i}
          className={`flex size-6 items-center justify-center rounded-full ${i < progress.successes ? 'bg-primary text-white' : 'border-[1.5px] border-dashed border-[#9AA39F]'}`}
        >
          {i < progress.successes && <CheckIcon size={14} />}
        </span>
      ))}
    </span>
  )
}

/** Tous les paliers d'un ordre : validés, en cours, à venir. */
export function LevelTrack({ progress }: { progress: Progress }) {
  return (
    <span className="flex gap-1" role="img" aria-label={levelLabel(progress)}>
      {Array.from({ length: progress.total }, (_, i) => {
        const n = i + 1
        const tone = n < progress.level ? 'bg-primary' : n === progress.level ? 'bg-[#F4C27A]' : 'bg-placeholder'
        return <span key={n} className={`h-2.5 flex-1 rounded-full ${tone}`} />
      })}
    </span>
  )
}
