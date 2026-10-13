import { Link } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { CheckIcon, ChevronRightIcon } from '../../components/Icons'
import { levelTitle, SKILLS, stepShort, TERRITORIES, type Territory } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { formatShort } from '../../lib/dates'
import { programWeek, type DayState } from '../../lib/rhythm'
import { currentExercise, LONG_SESSION_MINUTES, longSessionsDate, sessionMinutes } from '../../lib/training-plan'
import { useToday } from '../../lib/useToday'
import { dogLevel, nextLevelLabel } from '../../lib/level'
import { Badge } from './Badge'

const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const STATE_WORDS: Record<DayState, string> = { fait: 'noté', repos: 'repos', aujourdhui: "aujourd'hui", attente: 'rien de noté' }

function DayPill({ state }: { state: DayState }) {
  if (state === 'fait') {
    return (
      <span className="flex size-[34px] items-center justify-center rounded-full bg-primary text-white">
        <CheckIcon size={18} strokeWidth={3} />
      </span>
    )
  }
  if (state === 'repos') {
    return (
      <span className="flex size-[34px] items-center justify-center rounded-full bg-info-soft text-info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.500z" />
        </svg>
      </span>
    )
  }
  return <span className={`size-[34px] rounded-full ${state === 'aujourdhui' ? 'border-[3px] border-solid border-milestone bg-surface' : 'border-2 border-dashed border-[#B9C2BE]'}`} />
}

function Floor({ territory, active }: { territory: Territory; active: string[] }) {
  const { bossProgress } = useData()
  const target = TERRITORIES.find((t) => t.tier === territory.link.to)!
  return (
    <section id={`etage-${territory.tier}`} className="flex scroll-mt-4 flex-col gap-3 rounded-[26px] p-3" style={{ background: territory.soft }}>
      <div className="flex items-center gap-3 px-1 pt-1">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full text-white" style={{ background: territory.color }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {territory.tier === 'fondations' ? <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /> : territory.tier === 'quotidien' ? <path d="M12 21V9M12 9c-4 0-6-2-6-5 4 0 6 2 6 5zM12 13c4 0 6-2 6-5-4 0-6 2-6 5z" /> : <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>}
          </svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] font-bold tracking-[0.6px] uppercase" style={{ color: territory.color }}>
            {territory.floor}
          </span>
          <h2 className="font-display text-[22px] leading-tight font-extrabold">{territory.name}</h2>
          <span className="text-sm text-[#3F4946]">{territory.subtitle}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {SKILLS.filter((s) => s.tier === territory.tier).map((skill) => {
          const acquired = bossProgress[skill.id]?.level ?? 0
          const mastered = acquired >= MAX_LEVEL
          const current = active.includes(skill.id)
          const exercise = current ? currentExercise(skill.id, acquired)?.exercise : undefined
          return (
            <Link
              key={skill.id}
              to={`/competence/${skill.id}`}
              aria-label={`${skill.name}. ${mastered ? 'Maîtrisé, à entretenir' : `Prochaine étape : ${stepShort(skill.id, acquired + 1)}`}${current ? '. En cours' : ''}`}
              className="relative flex flex-col items-center gap-1.5 rounded-[20px] bg-surface px-2.5 pt-3.5 pb-3 text-center text-text no-underline shadow-[0_2px_6px_rgba(24,32,30,0.08)]"
            >
              {current && (
                <span className="absolute top-2 right-2 rounded-lg px-2 py-0.5 text-xs font-bold text-white" style={{ background: territory.color }}>
                  En cours
                </span>
              )}
              <Badge bossId={skill.id} acquired={acquired} />
              <span className="font-display text-base leading-tight font-extrabold">{skill.name}</span>
              {mastered ? (
                <span className="rounded-lg bg-gold-soft px-2 py-0.5 text-[13px] font-bold text-[#5C4410]">Maîtrisé · à entretenir</span>
              ) : (
                <span className={`text-sm leading-snug ${acquired ? 'text-[#3F4946]' : 'text-muted'}`}>{acquired || current ? stepShort(skill.id, acquired + 1) : 'À découvrir'}</span>
              )}
              {exercise && (
                <span className="mt-0.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] leading-tight font-bold" style={{ background: territory.soft, color: territory.color }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" className="shrink-0">
                    <path d="M2 1l7 4-7 4z" />
                  </svg>
                  {exercise.name}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => document.getElementById(`etage-${target.tier}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}
        className="flex min-h-16 items-center gap-3 rounded-[18px] border-2 border-solid bg-surface px-3.5 py-2.5 text-left text-text"
        style={{ borderColor: target.color }}
      >
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white ${territory.link.up ? '-rotate-90' : 'rotate-90'}`} style={{ background: target.color }}>
          <ChevronRightIcon size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-[15px] font-extrabold" style={{ color: target.color }}>
            {territory.link.label}
          </span>
          <span className="text-sm leading-snug font-semibold">{territory.link.text}</span>
        </span>
      </button>
    </section>
  )
}

/** Onglet Billy : l'arbre de compétences. Trois étages, dix badges, aucun chiffre. */
export default function Billy() {
  const { dog, entries, sessions, bossProgress, xpLog } = useData()
  const today = useToday()

  const level = dogLevel(bossProgress)
  const active = activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress)
  const minutes = sessionMinutes(dog.birthDate, today)
  const rests = xpLog.filter((e) => e.kind === 'repos').map((e) => e.date)
  const week = programWeek(today, [...entries, ...sessions].map((m) => m.date), rests)

  return (
    <div className="flex flex-col gap-[22px] px-4">
      <header className="flex items-center gap-3.5 px-1">
        <Link to="/profil" aria-label={`Voir le profil de ${dog.name}`} className="relative size-[72px] shrink-0 no-underline">
          <span className="flex size-[72px] items-center justify-center overflow-hidden rounded-full border-[3px] border-solid border-gold bg-milestone-soft font-display text-3xl font-bold text-milestone-dark">
            {dog.photoThumbFileId ? <FileImage fileId={dog.photoThumbFileId} alt="" className="size-full" eager /> : dog.name.charAt(0).toUpperCase()}
          </span>
          <span className="absolute -right-2 -bottom-2 rounded-full border-[3px] border-solid border-bg bg-primary px-2 py-0.5 text-xs font-bold text-white">profil</span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="font-display text-[28px] leading-none font-extrabold">L'arbre de {dog.name}</h1>
          <p className="text-[15px] font-bold text-[#3F4946]">
            Niveau {level.level} · {levelTitle(level.level)}
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-placeholder" role="img" aria-label={nextLevelLabel(level)}>
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(6, level.ratio * 100)}%` }} />
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-2.5">
        <p className="px-1 text-[15px] leading-snug text-[#3F4946]">Ses compétences poussent en 3 étages, de la maison au grand monde. Touchez-en une pour voir son chemin et vous entraîner.</p>
        <section aria-label="Son programme" className="flex flex-col gap-3 rounded-[22px] bg-surface px-4 py-3.5 shadow-[0_2px_8px_rgba(24,32,30,0.08)]">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-lg font-extrabold">Son programme</h2>
            <p className="text-sm leading-snug text-[#3F4946]">
              {active.length > 1 ? `${active.length} compétences en cours` : active.length === 1 ? '1 compétence en cours' : 'Aucune compétence en cours'} · séances de {minutes} min
              {minutes < LONG_SESSION_MINUTES ? ` (${LONG_SESSION_MINUTES} min dès ses 6 mois, le ${formatShort(longSessionsDate(dog.birthDate))})` : ''}
            </p>
          </div>
          <div role="img" aria-label={`Cette semaine : ${week.map((d, i) => `${DAY_NAMES[i]} ${STATE_WORDS[d.state]}`).join(', ')}`} className="flex justify-between">
            {week.map((day) => (
              <span key={day.date} className="flex flex-col items-center gap-1">
                <DayPill state={day.state} />
                <span className="text-xs font-bold text-[#3F4946]">{day.letter}</span>
              </span>
            ))}
          </div>
          <p className="text-[13px] leading-snug text-muted">Un jour de repos par semaine, et toujours le lendemain d'un moment difficile.</p>
          <Link to="/en-cours" className="btn btn-outline">
            Choisir ses compétences en cours
          </Link>
        </section>
      </div>

      {TERRITORIES.map((territory, i) => (
        <div key={territory.tier} className="flex flex-col">
          <Floor territory={territory} active={active} />
          {i < TERRITORIES.length - 1 && <span aria-hidden="true" className="-mb-[22px] h-[22px] w-3 self-center rounded-md bg-[#8A6A4A]" />}
        </div>
      ))}
    </div>
  )
}
