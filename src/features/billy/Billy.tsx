import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { CheckIcon, ChevronRightIcon, NoteIcon } from '../../components/Icons'
import { levelTitle, SKILL_GROUPS, SKILLS, stepPhrase } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { useData } from '../../firebase/store'
import { EMPTY_PROGRESS } from '../../lib/bossProgress'
import { sessionAsMoment } from '../../lib/carnet'
import { formatShort, parseISO } from '../../lib/dates'
import { questionnaireStatus, statusLabel } from '../../lib/questionnaire'
import { acquiredSteps } from '../../lib/skills'
import { progressStory, workingOn } from '../../lib/story'
import { suggestedBosses } from '../../lib/traits'
import { useToday } from '../../lib/useToday'
import { globalLevel, totalXp } from '../../lib/xp'
import { ProfileSections } from '../profile/Profile'
import { BossIcon } from '../training/BossIcon'
import { StepDots } from './StepDots'

const KNOWN_PREVIEW = 5
const title = 'text-xl font-bold'

/** Onglet Billy : ce qu'il sait faire, en phrases. Puis son profil. */
export default function Billy() {
  const { dog, entries, sessions, bossProgress, xpLog } = useData()
  const today = useToday()
  const [allKnown, setAllKnown] = useState(false)

  const level = globalLevel(totalXp(xpLog))
  const moments = [...entries, ...sessions.map(sessionAsMoment)]
  const stories = progressStory(moments, bossProgress, xpLog, today)
  const working = workingOn(moments, suggestedBosses(dog.traits ?? []), bossProgress, MAX_LEVEL)
  const known = acquiredSteps(bossProgress, xpLog)
  const year = parseISO(today).y
  const status = questionnaireStatus(dog.questionnaire, dog.traits ?? [])

  return (
    <div className="flex flex-col gap-[26px] px-5">
      <header className="flex items-center gap-3.5">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-milestone-soft font-display text-2xl font-bold text-milestone-dark">
          {dog.photoThumbFileId ? <FileImage fileId={dog.photoThumbFileId} alt="" className="size-full" eager /> : dog.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="font-display text-[28px] leading-none font-extrabold">{dog.name}</h1>
          <p className="text-[15px] font-semibold text-[#3F4946]">
            Niveau {level.level} · {levelTitle(level.level)}
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-placeholder" role="img" aria-label={`Encore ${level.needed - level.current} XP avant le niveau ${level.level + 1}`}>
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (level.current / level.needed) * 100)}%` }} />
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-2.5">
        <h2 className={title}>Ses progrès en un mois</h2>
        {stories.length > 0 ? (
          stories.map((story) => (
            <div key={story.bossId} className="card flex flex-col gap-2.5 px-4 py-3.5">
              <h3 className="text-[17px] font-bold">{story.name}</h3>
              <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5">
                <div className="flex flex-col gap-0.5 rounded-[14px] bg-bg p-2.5">
                  <span className="text-xs font-bold tracking-[0.4px] text-muted uppercase">{story.since}</span>
                  <span className="text-[15px] leading-snug font-semibold">{story.before}</span>
                </div>
                <ChevronRightIcon size={22} className="self-center text-muted" />
                <div className="flex flex-col gap-0.5 rounded-[14px] bg-primary-soft p-2.5">
                  <span className="text-xs font-bold tracking-[0.4px] text-primary-dark uppercase">Maintenant</span>
                  <span className="text-[15px] leading-snug font-bold text-primary-dark">{story.now}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card flex flex-col gap-3 p-4">
            <p className="text-[17px] leading-snug">Racontez quelques moments, vos progrès apparaîtront ici.</p>
            <Link to="/raconter" className="btn btn-outline">
              <NoteIcon size={22} />
              Raconter un moment
            </Link>
          </div>
        )}
      </section>

      {working.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className={title}>On travaille en ce moment</h2>
          {working.map((id) => {
            const skill = SKILLS.find((s) => s.id === id)!
            const progress = bossProgress[id] ?? EMPTY_PROGRESS
            return (
              <div key={id} className="card flex flex-col gap-2.5 px-4 py-3.5">
                <h3 className="text-[13px] font-bold tracking-[0.6px] text-primary uppercase">{skill.name}</h3>
                <p className="text-[17px] leading-snug font-semibold">{stepPhrase(id, progress.level + 1)}</p>
                <div className="flex items-center gap-3">
                  <StepDots progress={progress} />
                  <Link to={`/raconter?competences=${id}`} aria-label={`Raconter un moment pour ${skill.name}`} className="btn btn-outline min-h-12 shrink-0 px-4">
                    Raconter
                  </Link>
                </div>
              </div>
            )
          })}
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className={title}>Ce qu'il sait déjà faire</h2>
        {known.length > 0 ? (
          <>
            <ul className="card m-0 list-none px-4 py-1">
              {(allKnown ? known : known.slice(0, KNOWN_PREVIEW)).map((step, i) => (
                <li key={`${step.bossId}-${step.step}`} className={`flex items-start gap-3 py-3 ${i ? 'border-t border-divider' : ''}`}>
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[#8A6514]">
                    <CheckIcon size={16} strokeWidth={3} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base leading-snug font-semibold">{step.phrase}</span>
                    <span className="text-[13px] text-muted">{step.date ? formatShort(step.date, year) : "avant l'app"}</span>
                  </span>
                </li>
              ))}
            </ul>
            {known.length > KNOWN_PREVIEW && (
              <button type="button" onClick={() => setAllKnown(!allKnown)} className="btn btn-outline">
                {allKnown ? 'Réduire la liste' : "Voir tout ce qu'il sait faire"}
              </button>
            )}
          </>
        ) : (
          <div className="card flex flex-col gap-3 p-4">
            <p className="text-[17px] leading-snug">Dites-nous ce que {dog.name} sait déjà faire.</p>
            <Link to="/questionnaire" className="btn btn-outline">
              Ouvrir le questionnaire de départ
            </Link>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className={title}>Toutes ses compétences</h2>
        {SKILL_GROUPS.map((group) => (
          <div key={group.tier} className="flex flex-col gap-2">
            <h3 className="mt-1 text-[13px] font-bold tracking-[0.6px] text-muted uppercase">{group.label}</h3>
            {SKILLS.filter((s) => s.tier === group.tier).map((skill) => {
              const acquired = bossProgress[skill.id]?.level ?? 0
              return (
                <Link key={skill.id} to={`/competence/${skill.id}`} className="card-link min-h-16">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                    <BossIcon bossId={skill.id} size={24} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base font-bold">{skill.name}</span>
                    <span className="text-sm leading-snug text-muted">{acquired ? stepPhrase(skill.id, acquired) : 'Pas encore commencé'}</span>
                  </span>
                  <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
                </Link>
              )
            })}
          </div>
        ))}
      </section>

      <ProfileSections />

      <Link to="/questionnaire" className="card-link min-h-16">
        <NoteIcon size={24} className="shrink-0 text-primary" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-bold">Questionnaire de départ</span>
          <span className="text-sm text-muted">{statusLabel(status)}</span>
        </span>
        <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
      </Link>

      <p className="text-center text-[13px] text-muted">
        Version du {new Date(__BUILD_TIME__).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
