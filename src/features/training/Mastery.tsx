import type { Mastery, SessionResult, Trend } from '../../lib/training'

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

/** « Maîtrise 60 % · ↗ En progrès » */
export function MasteryText({ mastery, acquired = false }: { mastery: Mastery; acquired?: boolean }) {
  if (mastery.percent === undefined) return <>Jamais travaillé</>
  const trend = mastery.trend ? TREND_LABEL[mastery.trend] : undefined
  return (
    <>
      {acquired ? 'Acquis · ' : ''}
      Maîtrise {mastery.percent} %{trend && <span className={`font-semibold ${trend.tone}`}> · {trend.text}</span>}
    </>
  )
}
