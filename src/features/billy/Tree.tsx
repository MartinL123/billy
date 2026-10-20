import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { useBack } from '../../lib/useBack'
import { CheckIcon, ChevronRightIcon } from '../../components/Icons'
import { SKILLS, stepShort, TERRITORIES, type Territory } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { formatShort } from '../../lib/dates'
import { notedDays, programWeek, type DayState } from '../../lib/rhythm'
import { currentExercise, LONG_SESSION_MINUTES, longSessionsDate, sessionMinutes } from '../../lib/training-plan'
import { useToday } from '../../lib/useToday'
import { WalksCard } from '../trajets/WalksCard'
import { BoneIcon } from '../../components/BoneIcon'
import { balance } from '../../lib/bones'
import { BACKGROUNDS } from '../shop/Art'
import { DogPhoto } from '../shop/DogPhoto'
import { Badge } from './Badge'
import { ofName } from '../../lib/gender'

const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const STATE_WORDS: Record<DayState, string> = { fait: 'noté', repos: 'repos', attente: 'rien de noté' }

function DayPill({ state, today }: { state: DayState; today: boolean }) {
  // Aujourd’hui a toujours son contour orange, qu’il soit coché, en repos ou encore vide.
  const ring = today ? 'outline-[3px] outline-offset-2 outline-milestone outline-solid' : ''
  if (state === 'fait') {
    return (
      <span className={`flex size-[34px] items-center justify-center rounded-full bg-primary text-white ${ring}`}>
        <CheckIcon size={18} strokeWidth={3} />
      </span>
    )
  }
  if (state === 'repos') {
    return (
      <span className={`flex size-[34px] items-center justify-center rounded-full bg-info-soft text-info ${ring}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.500z" />
        </svg>
      </span>
    )
  }
  return <span className={`size-[34px] rounded-full ${today ? 'border-[3px] border-solid border-milestone bg-surface' : 'border-2 border-dashed border-line-strong'}`} />
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
              aria-label={`${skill.name}. ${mastered ? 'Maîtrisé, à entretenir' : `Prochaine étape : ${stepShort(skill.id, acquired + 1)}`}${current ? '. En cours' : ''}`}
              className="flex flex-col items-center gap-1.5 rounded-[20px] bg-surface px-2.5 pt-2.5 pb-3 text-center text-text no-underline shadow-[0_2px_6px_rgba(24,32,30,0.08)]"
            >
              {/* L’étiquette a sa propre ligne au-dessus du badge : elle ne recouvre jamais l’anneau. */}
              <span className={`rounded-lg px-2 py-0.5 text-xs font-bold text-white ${current ? '' : 'invisible'}`} style={{ background: territory.color }}>
                En cours
              </span>
              <Badge bossId={skill.id} acquired={acquired} />
              <span className="font-display text-base leading-tight font-extrabold">{skill.name}</span>
              {mastered ? (
                <span className="rounded-lg bg-gold-soft px-2 py-0.5 text-[13px] font-bold text-[#5C4410]">Maîtrisé · à entretenir</span>
              ) : (
                <span className={`text-sm leading-snug ${acquired ? 'text-[#3F4946]' : 'text-muted'}`}>{acquired || current ? stepShort(skill.id, acquired + 1) : 'À découvrir'}</span>
              )}
              {exercise && (
                <span className="mt-0.5 flex max-w-full items-center gap-1 rounded-[14px] px-2.5 py-1 text-left text-[13px] leading-tight font-bold" style={{ background: territory.soft, color: territory.color }}>
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

/** Onglet Billy : l’arbre de compétences. Trois étages, dix badges, aucun chiffre. */
export default function Tree() {
  const { dog, entries, sessions, exposures, bossProgress, xpLog, bones } = useData()
  const back = useBack('/billy')
  const today = useToday()

  const active = activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress)
  const minutes = sessionMinutes(dog.birthDate, today)
  const rests = xpLog.filter((e) => e.kind === 'repos').map((e) => e.date)
  const week = programWeek(today, notedDays(entries, sessions, exposures), rests)

  return (
    <div className="flex flex-col gap-[22px] px-4">
      <button type="button" onClick={back} className="btn btn-quiet min-h-11 self-start px-2">
        <ChevronLeftIcon size={20} />
        {dog.unnamed ? 'Votre chien' : dog.name}
      </button>
      {/* Fond de l’arbre acheté dans la boutique : derrière tout, les cartes restent blanches. */}
      {dog.cosmetics?.background && BACKGROUNDS[dog.cosmetics.background] && <div aria-hidden="true" className="fixed inset-0 -z-10" style={BACKGROUNDS[dog.cosmetics.background]} />}
      <header className="flex items-center gap-3.5 px-1">
        <Link to="/profil" aria-label={`Voir le profil ${ofName(dog.name)}`} className="relative size-[72px] shrink-0 no-underline">
          <DogPhoto size={72} className="rounded-full ring-[3px] ring-gold" />
          <span className="absolute -right-2 -bottom-2 rounded-full border-[3px] border-solid border-bg bg-primary px-2 py-0.5 text-xs font-bold text-white">profil</span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="font-display text-[28px] leading-none font-extrabold">L’arbre {ofName(dog.name)}</h1>
        </div>
      </header>

      {/* Les os : l’effort du maître, à côté du niveau (ce que le chien sait faire). Toute la carte ouvre la boutique. */}
      <Link to="/boutique" aria-label={`${balance(bones)} os, pour vos efforts. Ouvrir la boutique`} className="flex min-h-[76px] items-center gap-3.5 rounded-[22px] border-2 border-solid border-gold bg-[#FFF8E6] px-4 py-3 text-text no-underline">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(24,32,30,0.12)]">
          <BoneIcon size={30} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-[24px] leading-tight font-extrabold">{balance(bones)} os</span>
          <span className="truncate text-sm font-semibold text-gold-dark">Pour vos efforts</span>
        </span>
        <span className="flex min-h-11 shrink-0 items-center gap-0.5 rounded-full border-2 border-solid border-gold-dark px-3.5 text-[15px] font-bold text-gold-dark">
          Boutique
          <ChevronRightIcon size={18} />
        </span>
      </Link>

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
          <div role="img" aria-label={`Cette semaine : ${week.map((d, i) => `${DAY_NAMES[i]} ${STATE_WORDS[d.state]}${d.today ? " (aujourd’hui)" : ''}`).join(', ')}`} className="flex justify-between">
            {week.map((day) => (
              <span key={day.date} className="flex flex-col items-center gap-1">
                <DayPill state={day.state} today={day.today} />
                <span className="text-xs font-bold text-[#3F4946]">{day.letter}</span>
              </span>
            ))}
          </div>
          <p className="text-[13px] leading-snug text-muted">Un jour de repos par semaine, et toujours le lendemain d’un moment difficile.</p>
          <Link to="/en-cours" className="btn btn-outline">
            Choisir ses compétences en cours
          </Link>
        </section>
      </div>

      {/* Pas de connecteur entre les étages : le lien passe par les cartes « Mène au … ». */}
      {TERRITORIES.map((territory) => (
        <Floor key={territory.tier} territory={territory} active={active} />
      ))}

      <WalksCard />
    </div>
  )
}
