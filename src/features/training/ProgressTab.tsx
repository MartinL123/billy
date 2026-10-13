import { Link } from 'react-router-dom'
import { outlineButton } from '../../components/Form'
import type { Entry, Exposure, TrainingSession, WithId } from '../../firebase/types'
import { formatShort, type ISODate } from '../../lib/dates'
import { badges, isGame, weekOf, type LevelInfo } from '../../lib/gamification'
import { sameTag } from '../../lib/tags'
import { EXERCISES, exerciseStatus, fearSummaries, THEMES, type Trend } from '../../lib/training'
import { entryDateLabel } from '../journal/EntryCard'
import { Badges } from './Badges'
import { Hero } from './Hero'

const TREND: Record<Trend, { label: string; tone: string }> = {
  mieux: { label: 'En progrès', tone: 'text-primary' },
  stable: { label: 'Stable', tone: 'text-muted' },
  'moins-bien': { label: 'Plus difficile', tone: 'text-danger' },
}

const THEME_NAMES = { bases: 'Bases', proprete: 'Propreté', socialisation: 'Socialisation' }

interface ProgressTabProps {
  dogName: string
  today: ISODate
  sessions: WithId<TrainingSession>[]
  exposures: WithId<Exposure>[]
  entries: WithId<Entry>[]
  level: LevelInfo
  xp: number
  todayXp: number
  streakDays: number
}

/** Les avancées de Billy : niveau, semaine, exercices acquis, peurs, succès. */
export function ProgressTab({ dogName, today, sessions, exposures, entries, level, xp, todayXp, streakDays }: ProgressTabProps) {
  const exerciseSessions = sessions.filter((s) => !isGame(s))
  const activeDays = new Set([...sessions.map((s) => s.date), ...exposures.map((e) => e.date)])
  const fears = fearSummaries(exposures)
  const educatorNotes = entries.filter((e) => e.tags.some((t) => sameTag(t, 'Éducateur'))).slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      <Hero dogName={dogName} level={level} totalXp={xp} todayXp={todayXp} streakDays={streakDays} week={weekOf(today)} activeDays={activeDays} today={today} />

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Exercices acquis</h2>
        <div className="card flex flex-col gap-4 p-4">
          {THEMES.map(({ value }) => {
            const items = EXERCISES.filter((e) => e.theme === value)
            const acquired = items.filter((e) => exerciseStatus(exerciseSessions, e.id) === 'acquis').length
            return (
              <div key={value} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[15px]">
                  <span className="font-semibold">{THEME_NAMES[value]}</span>
                  <span className="text-muted">
                    {acquired} sur {items.length}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-placeholder" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(acquired / items.length) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {fears.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">Peurs</h2>
          <div className="card px-4 py-1">
            {fears.map((fear, i) => (
              <div key={fear.trigger} className={`flex flex-col gap-0.5 py-3 ${i ? 'border-t border-divider' : ''}`}>
                <span className="text-base font-semibold">{fear.trigger}</span>
                <span className="text-[13px]">
                  <span className={`font-semibold ${TREND[fear.trend].tone}`}>{fear.exposures.length > 1 ? TREND[fear.trend].label : 'Première note'}</span>
                  <span className="text-muted">
                    {' '}
                    · {fear.exposures.length > 1 ? `${fear.first.fear}/5 le ${formatShort(fear.first.date)} → ` : ''}
                    {fear.latest.fear}/5 le {formatShort(fear.latest.date)}
                    {fear.latest.distance !== undefined ? ` · à ${String(fear.latest.distance).replace('.', ',')} m` : ''}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Badges badges={badges(sessions, exposures, xp)} />

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Séances avec l'éducateur</h2>
        {educatorNotes.length > 0 ? (
          <div className="card overflow-hidden">
            {educatorNotes.map((entry, i) => (
              <Link key={entry.id} to={`/souvenir/${entry.id}`} className={`flex flex-col gap-1 px-4 py-3 text-text no-underline ${i ? 'border-t border-divider' : ''}`}>
                <span className="text-[13px] font-semibold text-muted">{entryDateLabel(entry.date, today)}</span>
                <span className="line-clamp-3 text-[15px] leading-[1.4]">{entry.text || 'Photos'}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[15px] leading-snug text-muted">Les consignes de l'éducateur, à retrouver ici et dans le journal avec le tag « Éducateur ».</p>
        )}
        <Link to="/souvenir/nouveau?tag=%C3%89ducateur" className={outlineButton}>
          Écrire une note de séance
        </Link>
      </section>
    </div>
  )
}
