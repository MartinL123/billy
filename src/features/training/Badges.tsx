import { LockIcon, StarIcon } from '../../components/Icons'
import type { Badge } from '../../lib/gamification'

/** Succès débloqués et à débloquer. */
export function Badges({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-bold">Succès</h2>
        <span className="text-sm font-semibold text-muted">
          {earned} sur {badges.length}
        </span>
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {badges.map((badge) => (
          <li
            key={badge.id}
            className={`flex flex-col items-center gap-1.5 rounded-[20px] px-2 py-3 text-center ${badge.earned ? 'card' : 'border-[1.5px] border-dashed border-border'}`}
          >
            <span className={`flex size-11 items-center justify-center rounded-full ${badge.earned ? 'bg-[#F4C27A] text-primary-dark' : 'bg-placeholder text-muted'}`}>
              {badge.earned ? <StarIcon size={22} /> : <LockIcon size={20} />}
            </span>
            <span className={`text-[13px] leading-tight font-bold ${badge.earned ? 'text-text' : 'text-muted'}`}>{badge.name}</span>
            <span className="text-[12px] leading-tight text-muted">{badge.detail}</span>
            <span className="sr-only">{badge.earned ? 'Débloqué' : 'À débloquer'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
