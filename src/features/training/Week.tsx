import { CheckIcon } from '../../components/Icons'
import { useData } from '../../firebase/store'
import { replaceQuest } from '../../firebase/training'
import { formatShort, parseISO } from '../../lib/dates'
import { FIRSTS } from '../../lib/firsts'
import { questProgress, weekQuests } from '../../lib/quests'
import { activeDays, daysTogether, sessionsThisWeek, weekId, weekOf, WEEKLY_GOAL } from '../../lib/rhythm'
import { useToday } from '../../lib/useToday'
import { XP } from '../../lib/xp'
import { restsOf } from './DressageAwards'

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Rythme de la semaine : 7 points, un objectif doux, un compteur qui ne revient jamais à zéro. */
export function Rhythm() {
  const { sessions, exposures, xpLog } = useData()
  const today = useToday()
  const rests = restsOf(xpLog)
  const active = activeDays(today, sessions, exposures)
  const restDays = new Set(rests.map((r) => r.date))
  const count = sessionsThisWeek(today, sessions)
  const together = daysTogether(sessions, exposures)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[19px] font-bold">Cette semaine</h2>
      <div className="card flex flex-col gap-3.5 p-4">
        <ol className="m-0 grid list-none grid-cols-7 gap-1 p-0">
          {weekOf(today).map((day, i) => {
            const trained = active.has(day)
            const rested = restDays.has(day)
            const isToday = day === today
            const state = trained ? 'entraînement' : rested ? 'repos' : isToday ? "aujourd'hui" : 'rien de noté'
            return (
              <li key={day} className="flex flex-col items-center gap-1.5" aria-label={`${parseISO(day).d} : ${state}`}>
                <span className={`text-[12px] ${isToday ? 'font-bold text-text' : 'text-muted'}`}>{DAY_LETTERS[i]}</span>
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${
                    trained ? 'bg-primary text-white' : rested ? 'bg-info-soft text-info' : isToday ? 'border-2 border-dashed border-primary' : 'bg-placeholder'
                  }`}
                >
                  {trained ? <CheckIcon size={16} /> : rested ? <span className="text-[13px] leading-none font-bold">z</span> : null}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="text-[15px] leading-snug">
          <span className="font-semibold">
            {count} séance{count > 1 ? 's' : ''} cette semaine
          </span>
          <span className="text-muted">{count >= WEEKLY_GOAL ? ' · objectif doux atteint' : ` · objectif doux : ${WEEKLY_GOAL}`}</span>
        </p>
        <p className="text-[15px] text-muted">
          {together === 0 ? 'Les jours d’entraînement s’additionnent ici, sans jamais repartir de zéro.' : `${together} jour${together > 1 ? 's' : ''} d'entraînement ensemble.`}
        </p>
      </div>
    </section>
  )
}

/** Trois quêtes au plus, remplaçables en un tap, sans pénalité si elles ne sont pas faites. */
export function Quests() {
  const { dog, sessions, exposures, xpLog, questWeeks } = useData()
  const today = useToday()
  const week = weekId(today)
  const replaced = questWeeks.find((q) => q.id === week)?.replaced ?? []
  const quests = weekQuests(week, dog.traits ?? [], replaced)
  const data = { sessions, exposures, rests: restsOf(xpLog) }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[19px] font-bold">Quêtes de la semaine</h2>
      <div className="card overflow-hidden">
        {quests.map((quest, i) => {
          const done = questProgress(quest, today, data)
          const finished = done >= quest.target
          return (
            <div key={quest.key} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-divider' : ''} ${finished ? 'bg-primary-soft' : ''}`}>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${finished ? 'bg-primary text-white' : 'bg-bg text-text'}`}>
                {finished ? <CheckIcon size={18} /> : `${done}/${quest.target}`}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-base leading-snug font-semibold">{quest.label}</span>
                <span className="text-[13px] text-muted">{finished ? `Terminée · +${XP.quest} XP` : `+${XP.quest} XP`}</span>
              </span>
              {!finished && (
                <button
                  type="button"
                  aria-label={`Remplacer la quête « ${quest.label} »`}
                  onClick={() => replaceQuest(week, [...replaced, quest.key])}
                  className="h-11 shrink-0 border-0 bg-transparent px-1 text-[15px] font-semibold text-primary"
                >
                  Changer
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[13px] leading-snug text-muted">Rien n'est perdu si une quête n'est pas faite : de nouvelles arrivent lundi.</p>
    </section>
  )
}

const NEXT_SHOWN = 3

/** Premières fois datées. Les succès cachés n'apparaissent qu'une fois obtenus. */
export function Firsts() {
  const { xpLog } = useData()
  const earned = new Map(xpLog.filter((e) => e.kind === 'premiere' && e.key).map((e) => [e.key as string, e.date]))
  // Les premières fois obtenues, puis seulement les 3 prochaines : le reste se découvre en route.
  const upcoming = FIRSTS.filter((f) => !earned.has(f.key) && !f.hidden).slice(0, NEXT_SHOWN)
  const visible = [...FIRSTS.filter((f) => earned.has(f.key)), ...upcoming]

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-bold">Premières fois</h2>
        <span className="text-sm font-semibold text-muted">{earned.size} obtenue{earned.size > 1 ? 's' : ''}</span>
      </div>
      <ul className="card m-0 list-none overflow-hidden p-0">
        {visible.map((first, i) => {
          const date = earned.get(first.key)
          return (
            <li key={first.key} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-divider' : ''}`}>
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${date ? 'bg-[#F4C27A] text-primary-dark' : 'border-[1.5px] border-dashed border-[#9AA39F]'}`}>
                {date && <CheckIcon size={16} />}
              </span>
              <span className={`flex-1 text-[15px] leading-snug ${date ? 'font-semibold text-text' : 'text-muted'}`}>{first.label}</span>
              {date && <span className="shrink-0 text-[13px] text-muted">{formatShort(date)}</span>}
            </li>
          )
        })}
      </ul>
      <p className="text-[15px] leading-snug text-muted">…et quelques surprises. Chaque première fois est ajoutée au Journal.</p>
    </section>
  )
}
