import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { bossById, LEVEL_PLACES, MAX_LEVEL, STATS } from '../../content/training'
import { useData } from '../../firebase/store'
import { setLevelDirectly } from '../../firebase/training'
import { EMPTY_PROGRESS, remaining, softAdvice } from '../../lib/bossProgress'
import { formatShort } from '../../lib/dates'
import { currentDifficulty } from '../../lib/session'
import { exercisesFor, levelFourUnadvised } from '../../lib/traits'
import { useBack } from '../../lib/useBack'
import { WEATHER_LABEL, WEATHER_NOTE } from '../../lib/weather'
import { BossIcon, WeatherIcon } from './BossIcon'
import { useDressage } from './useDressage'

/** Fiche d'un boss : objectif, échelle P1–P5, validations, conseil doux, exercices, lieux. */
export default function BossSheet() {
  const { id } = useParams()
  const { dog, bossProgress, places, sessions } = useData()
  const navigate = useNavigate()
  const back = useBack('/dressage')
  const { weatherByBoss, featured } = useDressage()
  const [choosing, setChoosing] = useState(false)
  const [direct, setDirect] = useState<number | null>(null)

  const boss = bossById(id ?? '')
  if (!boss) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted">Ce boss n'existe pas.</p>
        <button type="button" onClick={back} className="btn btn-main">
          Retour
        </button>
      </main>
    )
  }

  const traits = dog.traits ?? []
  const stored = bossProgress[boss.id]
  const progress = stored ?? EMPTY_PROGRESS
  const left = remaining(progress)
  const advice = softAdvice(boss, bossProgress)
  const weather = weatherByBoss[boss.id]
  const exercises = exercisesFor(boss.id, traits)
  const bossPlaces = places.filter((p) => p.bossId === boss.id)
  const placeName = (placeId: string) => bossPlaces.find((p) => p.id === placeId)?.name ?? 'Lieu'
  const validatedPlaces = [...new Set(progress.validations.filter((v) => v.level === MAX_LEVEL && v.placeId).map((v) => v.placeId as string))]
  const stars = progress.masteryPlaces.length

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-2 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={back} className="btn btn-outline">
          <ChevronLeftIcon />
          Dressage
        </button>
      </header>

      <main className="flex flex-col gap-6 px-5 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <BossIcon bossId={boss.id} size={32} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="font-display text-[28px] leading-tight font-bold">{boss.name}</h1>
              <div className="flex flex-wrap gap-1.5">
                {boss.stats.map((stat) => (
                  <span key={stat} className="rounded-xl bg-[#EEF0EE] px-2.5 py-0.5 text-[13px] font-semibold text-[#3F4946]">
                    {STATS.find((s) => s.id === stat)?.label}
                  </span>
                ))}
                {featured.includes(boss.id) && <span className="rounded-xl bg-milestone-soft px-2.5 py-0.5 text-[13px] font-bold text-milestone-dark">Conseillé pour {dog.name}</span>}
              </div>
            </div>
          </div>
          <p className="text-base leading-snug">{boss.goal}</p>
          <Pending show={Boolean(stored?.pending)} />
        </div>

        {weather && (
          <section aria-label="Météo de confiance" className="card flex items-center gap-3.5 p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info">
              <WeatherIcon weather={weather} size={28} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] text-muted">Météo de confiance</span>
              <span className="text-[17px] font-bold">{WEATHER_LABEL[weather]}</span>
              <span className="text-[13px] leading-snug text-muted">{WEATHER_NOTE}</span>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">Les 5 paliers</h2>
          <ol className="card m-0 list-none overflow-hidden p-0">
            {boss.levels.map((level, i) => {
              const n = i + 1
              const acquired = n <= progress.level
              const current = n === progress.level + 1
              return (
                <li key={n} className={`flex gap-3 px-4 py-3.5 ${i ? 'border-t border-divider' : ''} ${current ? 'bg-milestone-soft' : ''}`}>
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${acquired ? 'bg-primary text-white' : current ? 'bg-[#F4C27A] text-primary-dark' : 'border-[1.5px] border-solid border-[#C9D1CD] text-muted'}`}
                  >
                    {acquired ? <CheckIcon size={18} /> : `P${n}`}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-bold">
                      {acquired ? `P${n} · ` : ''}
                      {level.title}
                      {acquired && <span className="font-semibold text-primary"> · acquis</span>}
                    </span>
                    <span className="text-[13px] text-muted">{LEVEL_PLACES[i]}</span>
                    <span className="text-[15px] leading-snug">{level.criterion}</span>
                    {current && (
                      <span className="mt-1 text-[15px] font-semibold text-[#5C2A08]">
                        {left.done === 0
                          ? 'À valider 3 fois, sur 3 jours différents, détendu ou attentif.'
                          : `Validé ${left.done}/${left.needed}, il en reste ${left.needed - left.done}, un autre jour.`}
                        {n === MAX_LEVEL && ` Lieux différents : ${left.placesDone ?? 0}/3.`}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          {advice && (
            <p className="rounded-field bg-info-soft px-3.5 py-3 text-[15px] leading-snug text-[#1D3F73]">
              Ce palier sera plus facile si{' '}
              {advice.missing.map((req, i) => (
                <span key={req.bossId}>
                  {i > 0 && ' et '}
                  <Link to={`/boss/${req.bossId}`} replace className="font-semibold text-[#1D3F73] underline">
                    {bossById(req.bossId)?.name} atteint P{req.level}
                  </Link>
                </span>
              ))}
              . Travailler les deux en parallèle ?
            </p>
          )}
          {levelFourUnadvised(traits, progress.level + 1, weather) && (
            <p className="rounded-field bg-info-soft px-3.5 py-3 text-[15px] leading-snug text-[#1D3F73]">
              Le palier « Dehors animé » se tente plutôt quand la météo est au soleil ou aux éclaircies. D'ici là, les lieux calmes font très bien l'affaire.
            </p>
          )}
          {progress.level >= MAX_LEVEL && (
            <p className="rounded-field bg-primary-soft px-3.5 py-3 text-[15px] leading-snug font-semibold text-primary-dark">
              Maîtrise : chaque nouveau lieu validé ajoute une étoile. {stars > 0 ? `${stars} étoile${stars > 1 ? 's' : ''} pour l'instant.` : ''}
            </p>
          )}
          {progress.level < MAX_LEVEL && (
            <button type="button" onClick={() => setChoosing(true)} className="btn btn-outline self-start">
              {dog.name} maîtrise déjà un palier ?
            </button>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">Exercices conseillés</h2>
          <div className="card overflow-hidden">
            {exercises.map((exercise, i) => (
              <Link
                key={exercise.id}
                to={`/seance?boss=${boss.id}&exercice=${exercise.id}`}
                className={`flex min-h-[60px] items-center gap-3 px-4 py-2.5 text-text no-underline ${i ? 'border-t border-divider' : ''}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold">{exercise.name}</span>
                  <span className="truncate text-[13px] text-muted">
                    N{currentDifficulty(sessions, exercise.id)} · {exercise.levels[currentDifficulty(sessions, exercise.id) - 1]}
                    {exercise.verified ? '' : ' · à vérifier'}
                  </span>
                </span>
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              </Link>
            ))}
          </div>
        </section>

        {bossPlaces.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[19px] font-bold">Lieux</h2>
            <div className="flex flex-wrap gap-2">
              {bossPlaces.map((place) => {
                const star = progress.masteryPlaces.includes(place.id)
                const validated = validatedPlaces.includes(place.id)
                return (
                  <span key={place.id} className={`rounded-xl px-2.5 py-1 text-[13px] font-semibold ${star || validated ? 'bg-primary-soft text-primary-dark' : 'bg-[#EEF0EE] text-[#3F4946]'}`}>
                    {star ? '★ ' : ''}
                    {place.name}
                    {validated ? ' · validé' : ''}
                  </span>
                )
              })}
            </div>
          </section>
        )}

        {progress.validations.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-[19px] font-bold">Validations</h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px] text-muted">
              {[...progress.validations].reverse().slice(0, 6).map((v, i) => (
                <li key={i}>
                  P{v.level} · {formatShort(v.date)}
                  {v.placeId ? ` · ${placeName(v.placeId)}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto grid max-w-[430px] grid-cols-2 gap-2 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button type="button" onClick={() => navigate(`/exposition?boss=${boss.id}`)} className="btn btn-outline">
            Exposition
          </button>
          <button type="button" onClick={() => navigate(`/seance?boss=${boss.id}`)} className="btn btn-main">
            Séance
          </button>
        </div>
      </div>

      {choosing && (
        <Sheet label="Palier déjà maîtrisé" onClose={() => setChoosing(false)}>
          <h2 className="mt-1 font-display text-2xl font-bold">Palier déjà maîtrisé</h2>
          <p className="text-[15px] leading-snug text-muted">Choisis le plus haut palier que {dog.name} réussit déjà sans effort. Il est acquis tout de suite, sans XP.</p>
          {boss.levels.map((level, i) => {
            const n = i + 1
            if (n <= progress.level) return null
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setChoosing(false)
                  setDirect(n)
                }}
                className="flex min-h-14 flex-col justify-center rounded-field border-0 bg-bg px-3.5 py-2 text-left"
              >
                <span className="text-base font-semibold text-text">
                  P{n} · {level.title}
                </span>
                <span className="text-[13px] leading-snug text-muted">{level.criterion}</span>
              </button>
            )
          })}
        </Sheet>
      )}
      {direct !== null && (
        <ConfirmSheet
          title={`Valider jusqu'à P${direct} ?`}
          message={`${boss.name} : ${boss.levels[direct - 1]?.criterion}. Un palier acquis l'est pour toujours : il ne pourra pas être retiré.`}
          confirmLabel="Valider"
          tone="primary"
          onCancel={() => setDirect(null)}
          onConfirm={() => {
            setLevelDirectly(boss.id, stored, direct)
            setDirect(null)
          }}
        />
      )}
    </div>
  )
}
