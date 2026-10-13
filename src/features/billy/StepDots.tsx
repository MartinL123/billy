import { remaining, type BossProgress } from '../../lib/bossProgress'

/** Trois petits points : où on en est de la prochaine étape. */
export function StepDots({ progress }: { progress: BossProgress }) {
  const left = remaining(progress)
  const missing = left.needed - left.done
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex shrink-0 gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2.5 w-7 rounded-full ${i < left.done ? 'bg-milestone' : 'bg-placeholder'}`} />
        ))}
      </span>
      <span className="text-[15px] leading-tight text-muted">{left.done === 0 ? 'À réussir 3 jours différents' : `Encore ${missing} fois, un autre jour`}</span>
    </span>
  )
}
