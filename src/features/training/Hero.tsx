import { CheckIcon, FlameIcon } from '../../components/Icons'
import { parseISO, type ISODate } from '../../lib/dates'
import type { LevelInfo } from '../../lib/gamification'

interface HeroProps {
  dogName: string
  level: LevelInfo
  totalXp: number
  todayXp: number
  streakDays: number
  week: ISODate[]
  activeDays: Set<ISODate>
  today: ISODate
}

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Niveau de Billy, barre d'expérience, série et semaine en cours. */
export function Hero({ dogName, level, totalXp, todayXp, streakDays, week, activeDays, today }: HeroProps) {
  const ratio = Math.min(1, level.current / level.needed)
  return (
    <section aria-label={`Niveau de ${dogName}`} className="flex flex-col gap-4 rounded-3xl bg-primary p-5 text-white shadow-card">
      <div className="flex items-center gap-4">
        <div className="flex size-[72px] shrink-0 flex-col items-center justify-center rounded-full bg-white text-primary-dark">
          <span className="text-[11px] leading-none font-bold tracking-[0.6px] uppercase">Niveau</span>
          <span className="font-display text-[32px] leading-none font-bold">{level.level}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-2xl leading-tight font-bold">{level.title}</span>
          <span className="text-sm text-white/85">
            {totalXp} XP au total{todayXp > 0 ? ` · +${todayXp} aujourd'hui` : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-label="Progression vers le niveau suivant"
          aria-valuemin={0}
          aria-valuemax={level.needed}
          aria-valuenow={level.current}
          className="h-3 overflow-hidden rounded-full bg-white/25"
        >
          <div className="h-full rounded-full bg-[#F4C27A] transition-[width] duration-500" style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%` }} />
        </div>
        <div className="flex justify-between text-[13px] text-white/85">
          <span>
            {level.current} / {level.needed} XP
          </span>
          <span>
            Niveau {level.level + 1} : {level.nextTitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-white/12 px-3 py-2.5">
        <span className="flex items-center gap-1.5 pr-1">
          <FlameIcon size={22} className={streakDays > 0 ? 'text-[#F4C27A]' : 'text-white/60'} />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-bold">{streakDays}</span>
            <span className="text-[11px] text-white/85">{streakDays > 1 ? 'jours' : 'jour'}</span>
          </span>
        </span>
        <ol className="m-0 grid flex-1 list-none grid-cols-7 gap-1 p-0" aria-label="Jours d'entraînement cette semaine">
          {week.map((day, i) => {
            const active = activeDays.has(day)
            const isToday = day === today
            return (
              <li key={day} className="flex flex-col items-center gap-1" aria-label={`${parseISO(day).d} : ${active ? 'entraîné' : isToday ? "aujourd'hui, pas encore" : 'rien'}`}>
                <span className={`text-[11px] ${isToday ? 'font-bold text-white' : 'text-white/75'}`}>{DAY_LETTERS[i]}</span>
                <span
                  className={`flex size-7 items-center justify-center rounded-full ${
                    active ? 'bg-[#F4C27A] text-primary-dark' : isToday ? 'border-2 border-dashed border-white/80' : 'bg-white/15'
                  }`}
                >
                  {active && <CheckIcon size={16} />}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
