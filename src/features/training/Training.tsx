import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { outlineButton } from '../../components/Form'
import { ChevronRightIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { Pending } from '../../components/Pending'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { formatRelative, formatShort } from '../../lib/dates'
import { badges, fearToWork, gameOfTheDay, isGame, levelInfo, missionsDone, recommendExercises, totalXp, weekOf, xpByDay, type Game } from '../../lib/gamification'
import { sameTag } from '../../lib/tags'
import { EXERCISES, exerciseStatus, fearLabel, fearSummaries, STATUS_LABEL, streak, THEMES, type Exercise, type Status, type Theme, type Trend } from '../../lib/training'
import { useToday } from '../../lib/useToday'
import { entryDateLabel } from '../journal/EntryCard'
import { Badges } from './Badges'
import { ExposureSheet } from './ExposureSheet'
import { Games, GameSheet } from './Games'
import { Hero } from './Hero'
import { Missions, type MissionItem } from './Missions'
import { SessionSheet } from './SessionSheet'

const STATUS_TONE: Record<Status, string> = {
  'a-decouvrir': 'bg-[#EEF0EE] text-[#3F4946]',
  'en-cours': 'bg-info-soft text-info',
  acquis: 'bg-primary-soft text-primary-dark',
}

const TREND: Record<Trend, { label: string; tone: string }> = {
  mieux: { label: 'En progrès', tone: 'text-primary' },
  stable: { label: 'Stable', tone: 'text-muted' },
  'moins-bien': { label: 'Plus difficile', tone: 'text-danger' },
}

/** Niveau de peur sur 5 : pastilles pleines + chiffre, jamais la couleur seule. */
function FearDots({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-2.5 rounded-full ${n <= level ? 'bg-milestone' : 'bg-placeholder'}`} />
      ))}
    </span>
  )
}

export default function Training() {
  const { dog, sessions, exposures, entries } = useData()
  const today = useToday()
  const toast = useToast()
  const [theme, setTheme] = useState<Theme>('bases')
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [exposureSheet, setExposureSheet] = useState<{ trigger?: string } | null>(null)

  const progress = useMemo(() => {
    const byDay = xpByDay(sessions, exposures)
    const xp = totalXp(byDay)
    return { byDay, xp, level: levelInfo(xp) }
  }, [sessions, exposures])

  // Gain d'expérience et passage de niveau annoncés au moment où ils arrivent.
  const previousXp = useRef(progress.xp)
  useEffect(() => {
    const before = previousXp.current
    previousXp.current = progress.xp
    if (progress.xp <= before) return
    const levelBefore = levelInfo(before).level
    toast(
      progress.level.level > levelBefore
        ? `Niveau ${progress.level.level} ! ${dog.name} devient « ${progress.level.title} ».`
        : `+${progress.xp - before} XP pour ${dog.name}`,
    )
  }, [progress, dog.name, toast])

  const exerciseSessions = sessions.filter((s) => !isGame(s))
  const activeDays = new Set([...sessions.map((s) => s.date), ...exposures.map((e) => e.date)])
  const done = missionsDone(sessions, exposures, today)
  const dailyGame = gameOfTheDay(today)
  const [first, second] = recommendExercises(sessions, today)
  const fear = fearToWork(exposures.filter((e) => e.date < today))

  const missions: MissionItem[] = []
  if (first) {
    missions.push({ key: 'exercise', title: `Séance : ${first.exercise.name}`, detail: first.reason, advice: first.advice, onStart: () => setExercise(first.exercise) })
  }
  missions.push({ key: 'game', title: `Jeu : ${dailyGame.name}`, detail: `${dailyGame.minutes} min · ${dailyGame.skill}`, onStart: () => setGame(dailyGame) })
  if (fear) {
    missions.push({
      key: 'challenge',
      title: `Défi : ${fear}`,
      detail: 'Une exposition douce, à une distance où il mange encore',
      onStart: () => setExposureSheet({ trigger: fear }),
    })
  } else if (second) {
    missions.push({ key: 'challenge', title: `Défi : ${second.exercise.name}`, detail: `Un deuxième exercice · ${second.reason.toLowerCase()}`, onStart: () => setExercise(second.exercise) })
  }

  const plays = new Map<string, number>()
  for (const session of sessions) if (isGame(session)) plays.set(session.exerciseId, (plays.get(session.exerciseId) ?? 0) + 1)
  const playedToday = new Set(sessions.filter((s) => s.date === today && isGame(s)).map((s) => s.exerciseId))

  const themeExercises = EXERCISES.filter((e) => e.theme === theme)
  const themeAcquired = themeExercises.filter((e) => exerciseStatus(exerciseSessions, e.id) === 'acquis').length
  const fears = fearSummaries(exposures)
  const educatorNotes = entries.filter((e) => e.tags.some((t) => sameTag(t, 'Éducateur'))).slice(0, 3)

  return (
    <div className="flex flex-col gap-6 px-5">
      <PageHeader title="Dressage" />

      <Hero
        dogName={dog.name}
        level={progress.level}
        totalXp={progress.xp}
        todayXp={progress.byDay.get(today) ?? 0}
        streakDays={streak([...activeDays], today)}
        week={weekOf(today)}
        activeDays={activeDays}
        today={today}
      />

      <Missions items={missions} done={done} />

      <div className="-mx-5">
        <Games gameOfDay={dailyGame} playedToday={playedToday} plays={plays} onOpen={setGame} />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[19px] font-bold">Programme</h2>
          <span className="text-sm font-semibold text-muted">
            {themeAcquired} sur {themeExercises.length} acquis
          </span>
        </div>
        <div role="group" aria-label="Thème" className="grid grid-cols-3 gap-1 rounded-field bg-placeholder p-1">
          {THEMES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={`h-11 rounded-[10px] border-0 text-sm ${theme === value ? 'bg-surface font-bold text-text shadow-[0_1px_3px_rgba(24,32,30,0.12)]' : 'bg-transparent font-medium text-[#3F4946]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-placeholder" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(themeAcquired / Math.max(1, themeExercises.length)) * 100}%` }} />
        </div>
        <div className="card overflow-hidden">
          {themeExercises.map((item, i) => {
            const status = exerciseStatus(exerciseSessions, item.id)
            const last = exerciseSessions.find((s) => s.exerciseId === item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setExercise(item)}
                className={`flex min-h-[60px] w-full items-center gap-3 border-0 bg-transparent px-4 py-2.5 text-left ${i ? 'border-t border-solid border-divider' : ''}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold text-text">{item.name}</span>
                  <span className="text-[13px] text-muted">{last ? `Dernière séance ${formatRelative(last.date, today)}` : 'Jamais travaillé'}</span>
                  <Pending show={Boolean(last?.pending)} />
                </span>
                <span className={`shrink-0 rounded-xl px-2.5 py-1 text-[13px] font-semibold ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Peurs</h2>
        {fears.length > 0 ? (
          <div className="card overflow-hidden">
            {fears.map((item, i) => (
              <button
                key={item.trigger}
                type="button"
                onClick={() => setExposureSheet({ trigger: item.trigger })}
                className={`flex min-h-[60px] w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left ${i ? 'border-t border-solid border-divider' : ''}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-base font-semibold text-text">{item.trigger}</span>
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    <FearDots level={item.latest.fear} />
                    <span>
                      {item.latest.fear}/5 · {fearLabel(item.latest.fear)}
                      {item.latest.distance !== undefined ? ` · à ${String(item.latest.distance).replace('.', ',')} m` : ''}
                    </span>
                  </span>
                  <span className="text-[13px]">
                    {item.exposures.length > 1 ? (
                      <>
                        <span className={`font-semibold ${TREND[item.trend].tone}`}>{TREND[item.trend].label}</span>
                        <span className="text-muted">
                          {' '}
                          · {item.first.fear}/5 le {formatShort(item.first.date)} → {item.latest.fear}/5 · {item.exposures.length} expositions
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">1 exposition · {formatRelative(item.latest.date, today)}</span>
                    )}
                  </span>
                  <Pending show={item.exposures.some((e) => e.pending)} />
                </span>
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[15px] leading-snug text-muted">
            La ruelle, les enfants, un reflet la nuit : note chaque exposition avec son niveau de peur et la distance tolérée, pour voir les progrès et les montrer à l'éducateur.
          </p>
        )}
        <button type="button" onClick={() => setExposureSheet({})} className={outlineButton}>
          Noter une exposition
        </button>
      </section>

      <Badges badges={badges(sessions, exposures, progress.xp)} />

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

      {exercise && (
        <SessionSheet exercise={exercise} today={today} history={exerciseSessions.filter((s) => s.exerciseId === exercise.id)} onClose={() => setExercise(null)} />
      )}
      {game && <GameSheet game={game} today={today} onClose={() => setGame(null)} />}
      {exposureSheet && <ExposureSheet today={today} exposures={exposures} trigger={exposureSheet.trigger} onClose={() => setExposureSheet(null)} />}
    </div>
  )
}
