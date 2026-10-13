import { useState } from 'react'
import { FlameIcon } from '../../components/Icons'
import type { Exposure, TrainingSession, WithId } from '../../firebase/types'
import { chewOfTheDay } from '../../lib/chews'
import type { ISODate } from '../../lib/dates'
import { fearToWork, gameOfTheDay, isExercise, missionCount, missionsDone, recommendExercises, type LevelInfo } from '../../lib/gamification'
import { ChewCard, ExerciseCard, ExpandableRow, FearCard, GameCard } from './Cards'

interface TodayTabProps {
  dogName: string
  today: ISODate
  sessions: WithId<TrainingSession>[]
  exposures: WithId<Exposure>[]
  level: LevelInfo
  streakDays: number
  onFearDetails: (trigger: string) => void
  onSeeAll: () => void
}

/** Le programme de la journée : un ordre, un jeu, un défi, une chose à mâcher. On tape le résultat, c'est noté. */
export function TodayTab({ dogName, today, sessions, exposures, level, streakDays, onFearDetails, onSeeAll }: TodayTabProps) {
  const [open, setOpen] = useState<string | null>(null)
  const exerciseSessions = sessions.filter(isExercise)
  const recommended = recommendExercises(sessions, today)
  const [first, second] = recommended
  const fear = fearToWork(exposures.filter((e) => e.date < today))
  const count = missionCount(missionsDone(sessions, exposures, today))

  // Défi du jour : une exposition à sa plus grande peur, sinon un deuxième ordre.
  const challenge = fear ? undefined : second
  const extras = recommended.filter((r) => r !== first && r !== challenge).slice(0, 3)
  const ratio = Math.min(1, level.current / level.needed)

  return (
    <div className="flex flex-col gap-5">
      <section aria-label={`Niveau de ${dogName}`} className="flex flex-col gap-2 rounded-[20px] bg-primary px-4 py-3 text-white shadow-card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold">
            Niveau {level.level} · {level.title}
          </span>
          <span className="flex items-center gap-1 text-[15px] font-bold" aria-label={`${streakDays} jours de suite`}>
            <FlameIcon size={20} className={streakDays > 0 ? 'text-[#F4C27A]' : 'text-white/60'} />
            {streakDays}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`Progression vers le niveau ${level.level + 1}`}
          aria-valuemin={0}
          aria-valuemax={level.needed}
          aria-valuenow={level.current}
          className="h-2.5 overflow-hidden rounded-full bg-white/25"
        >
          <div className="h-full rounded-full bg-[#F4C27A] transition-[width] duration-500" style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%` }} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[19px] font-bold">À faire aujourd'hui</h2>
          <span className="text-sm font-semibold text-muted">{count} sur 3</span>
        </div>
        {first && <ExerciseCard label="Ordre du jour" exercise={first.exercise} advice={first.advice} today={today} sessions={exerciseSessions} />}
        <GameCard label="Jeu du jour" game={gameOfTheDay(today)} today={today} sessions={sessions} />
        {fear ? (
          <FearCard label="Défi · sa plus grande peur" trigger={fear} today={today} exposures={exposures} onDetails={() => onFearDetails(fear)} />
        ) : (
          challenge && <ExerciseCard label="Défi · un deuxième ordre" exercise={challenge.exercise} advice={challenge.advice} today={today} sessions={exerciseSessions} />
        )}
        {count === 3 && (
          <p role="status" className="rounded-[20px] bg-primary px-4 py-3.5 text-center text-base font-bold text-white">
            Journée parfaite ! Bravo {dogName}.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">À mâcher</h2>
        <ChewCard label="Idée du jour" chew={chewOfTheDay(today)} today={today} sessions={sessions} />
      </section>

      {extras.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[19px] font-bold">Envie d'en faire plus ?</h2>
            <button type="button" onClick={onSeeAll} className="min-h-11 border-0 bg-transparent p-0 text-[15px] font-semibold text-primary">
              Tout voir
            </button>
          </div>
          <div className="card overflow-hidden">
            {extras.map((item, i) => (
              <ExpandableRow
                key={item.exercise.id}
                name={item.exercise.name}
                detail={item.reason}
                open={open === item.exercise.id}
                first={i === 0}
                onToggle={() => setOpen(open === item.exercise.id ? null : item.exercise.id)}
              >
                <ExerciseCard exercise={item.exercise} advice={item.advice} today={today} sessions={exerciseSessions} />
              </ExpandableRow>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
