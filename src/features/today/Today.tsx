import { Link } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { CheckIcon, ChevronRightIcon, NoteIcon, TargetIcon } from '../../components/Icons'
import { levelTitle, SKILLS } from '../../content/phrases'
import { useData } from '../../firebase/store'
import { formatAgeShort, milestoneMessage, nextLifeStep } from '../../lib/age'
import { challengeProgress, weekChallenge } from '../../lib/challenge'
import { diffDays, formatDayHeading, formatLong, formatRelative, formatTime } from '../../lib/dates'
import { typeInfo, upcoming } from '../../lib/events'
import { nextMealIndex, portion, sortMeals } from '../../lib/feeding'
import { bossById } from '../../content/training'
import { questionnaireStatus } from '../../lib/questionnaire'
import { weekId } from '../../lib/rhythm'
import { lastSuccess } from '../../lib/skills'
import { useToday } from '../../lib/useToday'
import { dogLevel, nextLevelLabel } from '../../lib/level'
import { Badge } from '../billy/Badge'
import { DailyIdeas } from './DailyIdeas'
import { QuestCard } from './QuestCard'

const RING = 2 * Math.PI * 46

/** Accueil : la partie. Le niveau de Billy, puis l'action principale : noter ce qu'on a fait. */
export default function Today() {
  const { dog, events, entries, sessions, bossProgress, xpLog } = useData()
  const today = useToday()

  const level = dogLevel(bossProgress)
  const ratio = level.ratio
  const life = nextLifeStep(dog.birthDate, today)
  const questionnaire = questionnaireStatus(dog.questionnaire)
  const challenge = weekChallenge(weekId(today), bossProgress)
  const done = challengeProgress(challenge, today, entries, sessions)
  const success = lastSuccess(bossProgress, xpLog)
  const celebration = milestoneMessage(dog.name, dog.birthDate, dog.adoptionDate, today)

  const meals = sortMeals(dog.feeding?.meals ?? [])
  const nextMeal = meals[nextMealIndex(meals, new Date().toTimeString().slice(0, 5)) ?? -1]
  const grams = dog.feeding ? portion(dog.feeding) : undefined
  const care = upcoming(events, today).slice(0, 2)

  return (
    <div className="flex flex-col gap-4 px-5">
      <p className="text-[15px] font-medium text-muted">{formatDayHeading(today)}</p>

      <Link to="/billy" aria-label={`${dog.name}, niveau ${level.level}, ${levelTitle(level.level)}. Voir ce qu'il sait faire`} className="flex items-center gap-[18px] rounded-[28px] bg-primary p-5 text-white no-underline shadow-[0_6px_18px_rgba(30,90,80,0.25)]">
        <span className="relative size-[104px] shrink-0">
          <svg viewBox="0 0 104 104" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
            <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="8" />
            <circle cx="52" cy="52" r="46" fill="none" stroke="#F2B544" strokeWidth="8" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - ratio)} className="transition-[stroke-dashoffset] duration-700" />
          </svg>
          <span className="absolute inset-3 flex items-center justify-center overflow-hidden rounded-full bg-milestone-soft font-display text-4xl font-bold text-milestone-dark">
            {dog.photoThumbFileId ? <FileImage fileId={dog.photoThumbFileId} alt="" className="size-full" eager /> : dog.name.charAt(0).toUpperCase()}
          </span>
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-xl bg-gold px-2.5 py-[3px] font-display text-[13px] font-extrabold whitespace-nowrap text-gold-dark">Niv. {level.level}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-display text-[28px] leading-none font-extrabold">{dog.name}</span>
          <span className="text-[17px] font-bold text-[#F7D58A]">{levelTitle(level.level)}</span>
          <span className="text-sm text-white/85">
            {nextLevelLabel(level)}
          </span>
          {life && (
            <span className="text-[13px] text-white/75">
              {formatAgeShort(dog.birthDate, today)} · {life.label} le {formatLong(life.date).replace(/ \d{4}$/, '')}
            </span>
          )}
        </span>
        <ChevronRightIcon size={24} className="shrink-0" />
      </Link>

      {celebration && <p className="rounded-[20px] bg-primary-soft px-4 py-3 text-[15px] font-medium text-primary-dark">{celebration}</p>}

      {!questionnaire.complete && (
        <section className="flex flex-col gap-3 rounded-[22px] bg-milestone-soft p-4">
          <p className="text-[17px] leading-snug font-semibold text-[#5C2A08]">Terminez le questionnaire : {dog.name} gagnera ses premières étapes.</p>
          <Link to="/questionnaire" className="btn btn-main">
            Continuer le questionnaire
          </Link>
        </section>
      )}

      <QuestCard />

      <Link to="/noter" className={`btn min-h-[60px] text-[18px] ${questionnaire.complete ? 'btn-main shadow-[0_4px_12px_rgba(194,87,26,0.3)]' : 'btn-outline'}`}>
        <NoteIcon size={24} />
        Noter ce qu'on a fait
      </Link>
      <Link to="/exercice" className="btn btn-outline min-h-14">
        <TargetIcon size={22} />
        Faire un exercice
      </Link>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold">Ses badges</h2>
          <Link to="/billy" className="btn btn-outline min-h-12 px-4 text-[15px]">
            Son arbre
          </Link>
        </div>
        <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pt-0.5 pb-1.5">
          {SKILLS.map((skill) => (
            <Link key={skill.id} to={`/competence/${skill.id}`} className="flex w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-solid border-border bg-surface px-1 py-2.5 text-text no-underline">
              <Badge bossId={skill.id} acquired={bossProgress[skill.id]?.level ?? 0} size={68} />
              <span className="text-center text-[13px] leading-tight font-bold">{skill.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Défi de la semaine" className="card flex flex-col gap-3 rounded-[22px] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-bold tracking-[0.6px] text-milestone-dark uppercase">Défi de la semaine</h2>
          <span className="text-sm font-bold text-primary">▲ {bossById(challenge.bossId)?.name}</span>
        </div>
        <p className="text-[17px] leading-snug font-semibold">{challenge.label}</p>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-2.5 rounded-full ${i < done ? 'bg-milestone' : 'bg-placeholder'}`} />
          ))}
        </div>
        <p className="text-sm text-muted">{done >= challenge.target ? 'Défi réussi, bravo !' : "Rien n'est perdu si ce n'est pas fini dimanche."}</p>
      </section>

      {success?.date ? (
        <Link to={`/competence/${success.bossId}`} className="card-link rounded-[22px]">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[#8A6514]">
            <CheckIcon size={24} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-bold tracking-[0.6px] text-[#8A6514] uppercase">Dernière réussite · {formatRelative(success.date, today)}</span>
            <span className="text-base leading-snug font-semibold">{success.phrase}</span>
          </span>
          <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
        </Link>
      ) : null}

      <section className="flex flex-col gap-2.5">
        <h2 className="mt-1 text-[19px] font-bold">Aujourd'hui</h2>
        <div className="card overflow-hidden">
          {nextMeal && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="size-2.5 shrink-0 rounded-full bg-primary" />
              <span className="flex-1 text-base font-semibold">
                Repas de {formatTime(nextMeal.time)}
                {grams ? ` · ${grams} g` : ''}
              </span>
              <span className="text-sm text-muted">{nextMeal.label}</span>
            </div>
          )}
          {care.map((event, i) => {
            const late = diffDays(event.date, today) > 0
            return (
              <div key={event.id} className={`flex items-center gap-3 px-4 py-3.5 ${nextMeal || i ? 'border-t border-divider' : ''}`}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: typeInfo(event.type).color }} />
                <span className="min-w-0 flex-1 truncate text-base font-semibold">{event.title}</span>
                <span className={`shrink-0 text-sm ${late ? 'font-semibold text-danger' : 'text-muted'}`}>{late ? 'en retard' : formatRelative(event.date, today)}</span>
              </div>
            )
          })}
          {!nextMeal && care.length === 0 && <p className="px-4 py-3.5 text-base text-muted">Rien de prévu aujourd'hui.</p>}
        </div>
        <Link to="/sante" className="card-link">
          <span className="flex-1 text-[17px] font-semibold">Voir la santé et les rendez-vous</span>
          <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
        </Link>
      </section>

      <DailyIdeas today={today} />
    </div>
  )
}
