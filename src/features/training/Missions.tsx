import type { ReactNode } from 'react'
import { CheckIcon, ChevronRightIcon, DiceIcon, StarIcon, TargetIcon } from '../../components/Icons'
import { missionCount, XP, type DayMissions } from '../../lib/gamification'

export interface MissionItem {
  key: keyof DayMissions
  title: string
  /** Suggestion du jour et raison. */
  detail: string
  advice?: string
  onStart: () => void
}

const ICONS: Record<keyof DayMissions, ReactNode> = {
  exercise: <TargetIcon size={22} />,
  game: <DiceIcon size={22} />,
  challenge: <StarIcon size={22} />,
}

/** Les 3 missions du jour : un exercice, un jeu, un défi. */
export function Missions({ items, done }: { items: MissionItem[]; done: DayMissions }) {
  const count = missionCount(done)
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-bold">Missions du jour</h2>
        <span className="text-sm font-semibold text-muted">{count} sur 3</span>
      </div>
      <div className="card overflow-hidden">
        {items.map((item, i) => {
          const isDone = done[item.key]
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onStart}
              className={`flex min-h-[68px] w-full items-center gap-3 border-0 px-4 py-3 text-left ${isDone ? 'bg-primary-soft' : 'bg-transparent'} ${i ? 'border-t border-solid border-divider' : ''}`}
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${isDone ? 'bg-primary text-white' : 'bg-bg text-primary'}`}>
                {isDone ? <CheckIcon size={22} /> : ICONS[item.key]}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-base font-semibold ${isDone ? 'text-primary-dark' : 'text-text'}`}>{item.title}</span>
                <span className="text-[13px] text-muted">{isDone ? 'Fait' : item.detail}</span>
                {!isDone && item.advice && <span className="text-[13px] font-medium text-info">{item.advice}</span>}
              </span>
              {isDone ? (
                <span className="shrink-0 text-[13px] font-bold text-primary-dark">+{XP.mission} XP</span>
              ) : (
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              )}
            </button>
          )
        })}
        <div className={`border-t border-divider px-4 py-3 text-[13px] font-semibold ${count === 3 ? 'bg-primary text-white' : 'text-muted'}`}>
          {count === 3 ? `Journée parfaite ! +${XP.perfectDay} XP de bonus` : `Les 3 missions le même jour : +${XP.perfectDay} XP de bonus`}
        </div>
      </div>
    </section>
  )
}
