import { FlameIcon } from '../../components/Icons'
import type { Exposure, TrainingSession, WithId } from '../../firebase/types'
import type { ISODate } from '../../lib/dates'
import { fearToWork, gameOfTheDay, isGame, missionCount, missionsDone, recommendExercises, type LevelInfo } from '../../lib/gamification'
import { ExerciseCard, FearCard, GameCard } from './Cards'

interface TodayTabProps {
  dogName: string
  today: ISODate
  sessions: WithId<TrainingSession>[]
  exposures: WithId<Exposure>[]
  level: LevelInfo
  streakDays: number
  onFearDetails: (trigger: string) => void
}

/** Ce qu'il y a à faire aujourd'hui : on tape le résultat, c'est enregistré. */
export function TodayTab({ dogName, today, sessions, exposures, level, streakDays, onFearDetails }: TodayTabProps) {
  const exerciseSessions = sessions.filter((s) => !isGame(s))
  const recommended = recommendExercises(sessions, today)
  const [first, second] = recommended
  const fear = fearToWork(exposures.filter((e) => e.date < today))
  const count = missionCount(missionsDone(sessions, exposures, today))

  // Défi du jour : une exposition à sa plus grande peur, sinon un deuxième exercice.
  const challenge = fear ? undefined : second
  const extras = recommended.filter((r) => r !== first && r !== challenge).slice(0, 2)
  const ratio = Math.min(1, level.current / level.needed)

  return (
    <div className="flex flex-col gap-5">
      <section aria-label={`Niveau de ${dogName}`} className="flex flex-col gap-2.5 rounded-[20px] bg-primary p-4 text-white shadow-card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[17px] font-bold">
            Niveau {level.level} · {level.title}
          </span>
          <span className="flex items-center gap-1 text-[15px] font-bold" aria-label={`${streakDays} jours de suite`}>
            <FlameIcon size={20} className={streakDays > 0 ? 'text-[#F4C27A]' : 'text-white/60'} />
            {streakDays}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Progression vers le niveau suivant"
          aria-valuemin={0}
          aria-valuemax={level.needed}
          aria-valuenow={level.current}
          className="h-2.5 overflow-hidden rounded-full bg-white/25"
        >
          <div className="h-full rounded-full bg-[#F4C27A] transition-[width] duration-500" style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%` }} />
        </div>
        <span className="text-[13px] text-white/85">Encore {level.needed - level.current} XP avant le niveau {level.level + 1}</span>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[19px] font-bold">À faire aujourd'hui</h2>
          <span className="text-sm font-semibold text-muted">{count} sur 3</span>
        </div>
        {first && <ExerciseCard label={`Exercice · ${first.reason.toLowerCase()}`} exercise={first.exercise} advice={first.advice} today={today} sessions={exerciseSessions} />}
        <GameCard label="Jeu du jour" game={gameOfTheDay(today)} today={today} sessions={sessions} />
        {fear ? (
          <FearCard label="Défi · sa plus grande peur" trigger={fear} today={today} exposures={exposures} onDetails={() => onFearDetails(fear)} />
        ) : (
          challenge && <ExerciseCard label={`Défi · ${challenge.reason.toLowerCase()}`} exercise={challenge.exercise} advice={challenge.advice} today={today} sessions={exerciseSessions} />
        )}
        {count === 3 && (
          <p role="status" className="rounded-[20px] bg-primary px-4 py-3.5 text-center text-base font-bold text-white">
            Journée parfaite ! Bravo {dogName}.
          </p>
        )}
      </section>

      {extras.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">{count === 3 ? 'Encore envie ?' : 'Ensuite'}</h2>
          {extras.map((item) => (
            <ExerciseCard key={item.exercise.id} label={item.reason} exercise={item.exercise} advice={item.advice} today={today} sessions={exerciseSessions} />
          ))}
        </section>
      )}
    </div>
  )
}
