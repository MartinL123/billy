import { useState } from 'react'
import { Link } from 'react-router-dom'
import { outlineButton } from '../../components/Form'
import { ChevronRightIcon, FlameIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { useData } from '../../firebase/store'
import { formatRelative, formatShort } from '../../lib/dates'
import { sameTag } from '../../lib/tags'
import { EXERCISES, exerciseStatus, fearLabel, fearSummaries, STATUS_LABEL, streak, THEMES, type Exercise, type Status, type Theme, type Trend } from '../../lib/training'
import { useToday } from '../../lib/useToday'
import { entryDateLabel } from '../journal/EntryCard'
import { ExposureSheet } from './ExposureSheet'
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
  const [theme, setTheme] = useState<Theme>('bases')
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [exposureSheet, setExposureSheet] = useState<{ trigger?: string } | null>(null)

  const days = streak([...sessions.map((s) => s.date), ...exposures.map((e) => e.date)], today)
  const trainedToday = sessions.some((s) => s.date === today) || exposures.some((e) => e.date === today)
  const acquired = EXERCISES.filter((e) => exerciseStatus(sessions, e.id) === 'acquis').length
  const fears = fearSummaries(exposures)
  const educatorNotes = entries.filter((e) => e.tags.some((t) => sameTag(t, 'Éducateur'))).slice(0, 3)

  return (
    <div className="flex flex-col gap-6 px-5">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[32px] font-bold tracking-[-0.5px]">Dressage</h1>
        <div className="card flex items-center gap-3.5 p-4">
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${days > 0 ? 'bg-milestone-soft text-milestone-dark' : 'bg-placeholder text-muted'}`}>
            <FlameIcon size={26} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[17px] font-bold">{days === 0 ? 'Pas encore de série' : days === 1 ? '1 jour de suite' : `${days} jours de suite`}</span>
            <span className="text-sm text-muted">
              {days === 0
                ? `Note une séance pour lancer la série de ${dog.name}.`
                : trainedToday
                  ? `C'est fait pour aujourd'hui. ${acquired} exercice${acquired > 1 ? 's' : ''} acquis sur ${EXERCISES.length}.`
                  : "Une courte séance aujourd'hui garde la série."}
            </span>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Programme</h2>
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
        <div className="card overflow-hidden">
          {EXERCISES.filter((e) => e.theme === theme).map((item, i) => {
            const status = exerciseStatus(sessions, item.id)
            const last = sessions.find((s) => s.exerciseId === item.id)
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
            {fears.map((fear, i) => (
              <button
                key={fear.trigger}
                type="button"
                onClick={() => setExposureSheet({ trigger: fear.trigger })}
                className={`flex min-h-[60px] w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left ${i ? 'border-t border-solid border-divider' : ''}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-base font-semibold text-text">{fear.trigger}</span>
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    <FearDots level={fear.latest.fear} />
                    <span>
                      {fear.latest.fear}/5 · {fearLabel(fear.latest.fear)}
                      {fear.latest.distance !== undefined ? ` · à ${String(fear.latest.distance).replace('.', ',')} m` : ''}
                    </span>
                  </span>
                  <span className="text-[13px]">
                    {fear.exposures.length > 1 ? (
                      <>
                        <span className={`font-semibold ${TREND[fear.trend].tone}`}>{TREND[fear.trend].label}</span>
                        <span className="text-muted">
                          {' '}
                          · {fear.first.fear}/5 le {formatShort(fear.first.date)} → {fear.latest.fear}/5 · {fear.exposures.length} expositions
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">1 exposition · {formatRelative(fear.latest.date, today)}</span>
                    )}
                  </span>
                  <Pending show={fear.exposures.some((e) => e.pending)} />
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
        <SessionSheet exercise={exercise} today={today} history={sessions.filter((s) => s.exerciseId === exercise.id)} onClose={() => setExercise(null)} />
      )}
      {exposureSheet && <ExposureSheet today={today} exposures={exposures} trigger={exposureSheet.trigger} onClose={() => setExposureSheet(null)} />}
    </div>
  )
}
