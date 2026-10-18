import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BoneIcon } from '../../components/BoneIcon'
import { ChevronRightIcon, PlusIcon } from '../../components/Icons'
import { setEventDone } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { completeQuest, skipQuest } from '../../firebase/training'
import { QUEST_XP } from '../../lib/quest'
import { balance } from '../../lib/bones'
import { formatDayHeading, formatLong } from '../../lib/dates'
import { portion, sortMeals } from '../../lib/feeding'
import { contextLine, nextLines, nowCard, type NowCard, type NowInput } from '../../lib/nowCard'
import { questionnaireStatus } from '../../lib/questionnaire'
import { formatRouteDistance } from '../../lib/route'
import { useToday } from '../../lib/useToday'
import { lateLabel } from '../../lib/events'
import { walkItems } from '../../lib/walkList'
import { formatHour, walkTimes } from '../../lib/walks'
import { InstallBanner, PasswordPrompt } from '../account/HomeNotices'
import { DogPhoto } from '../shop/DogPhoto'
import { Illustration } from '../training/Illustration'
import { useQuest } from './useQuest'

const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Ce que montre la carte « À faire maintenant » : une phrase, deux lignes, un seul bouton. */
function useCardContent(card: NowCard) {
  const { dog, events, entries } = useData()
  const { quest, mission, minutes, canSkip, skips } = useQuest()
  const today = useToday()
  switch (card.kind) {
    case 'soin':
      return {
        badge: 'À faire maintenant',
        title: card.event.title,
        text: `${card.event.date && card.event.date < today ? lateLabel(card.event.date, today) : 'C’est le jour'} : une minute, puis c’est noté dans Santé.`,
        scene: undefined,
        action: { label: 'C’est fait', run: () => setEventDone(events.find((e) => e.id === card.event.id)!, true) },
      }
    case 'repas':
      return {
        badge: `Repas de ${formatHour(card.time)}`,
        title: `Le repas de ${formatHour(card.time)}`,
        text: dog.feeding ? `${portion(dog.feeding)} g de croquettes. Un repas calme, sans le déranger.` : 'Un repas calme, sans le déranger.',
        scene: undefined,
        action: { label: 'Voir ses repas', to: '/sante' },
      }
    case 'mission':
      // Journée de repos : ni durée ni « Commencer » ; on peut demander une autre idée (audit R-011).
      if (quest.kind === 'repos')
        return {
          badge: 'Journée de repos',
          title: mission.title,
          text: mission.detail,
          scene: undefined,
          action: canSkip ? { label: 'Une autre idée', run: () => skipQuest(today, skips + 1) } : { label: 'C’est noté, on se repose', run: () => completeQuest(today, { kind: 'repos' }, skips, QUEST_XP) },
          other: canSkip ? { label: 'Garder le repos', run: () => completeQuest(today, { kind: 'repos' }, skips, QUEST_XP) } : undefined,
        }
      return {
        badge: `À faire maintenant · ${minutes} min`,
        title: mission.title,
        text: mission.detail,
        scene: quest.planned?.exercise.scene,
        action: { label: 'Commencer', to: '/mission' },
        other: canSkip ? { label: 'Une autre idée', run: () => skipQuest(today, skips + 1) } : undefined,
      }
    case 'sortie':
      return {
        badge: `Sortie de ${formatHour(card.time)}`,
        title: `La sortie de ${formatHour(card.time)}`,
        text: 'Hors du jardin, même 15 minutes. Elle se cochera toute seule avec votre balade Strava.',
        scene: undefined,
        // Pas de bouton : la balade arrive avec l'import Strava, rien à faire d'ici (pas d'export depuis l'iPhone).
        action: undefined,
      }
    case 'soir':
      return {
        badge: 'Aujourd’hui',
        title: 'La mission est faite',
        text: `${card.done ? `${card.done} sortie${card.done > 1 ? 's' : ''} sur 3 aujourd’hui.` : 'Pas encore de sortie cochée aujourd’hui.'} Elles se cochent toutes seules avec vos balades Strava.`,
        scene: undefined,
        action: { label: 'Noter un souvenir', to: '/noter' },
      }
    default: {
      const last = walkItems(entries)[0]
      return {
        badge: 'Aujourd’hui',
        title: 'Tout est fait pour aujourd’hui',
        text: last ? `Dernière balade : ${last.name}, ${formatLong(last.date)} · ${formatRouteDistance(last.route.distanceM)}.` : 'Bravo à vous deux. Un souvenir à garder ?',
        scene: undefined,
        action: last ? { label: 'Revoir la balade', to: `/souvenir/${last.id}` } : { label: 'Noter un souvenir', to: '/noter' },
      }
    }
  }
}

/** Aujourd'hui (spec V4 § 2) : on comprend en 10 secondes quoi faire. Une carte, un bouton plein. */
export default function Today() {
  const { dog, events, bones, walks } = useData()
  const today = useToday()
  const { done: missionDone, minutes, quest } = useQuest()
  const [now, setNow] = useState(nowMinutes)
  useEffect(() => {
    const timer = setInterval(() => setNow(nowMinutes()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const input: NowInput = {
    today,
    now,
    care: events,
    meals: sortMeals(dog.feeding?.meals ?? []),
    // Journée de repos : pas de « minutes de mission » à annoncer.
    mission: { done: missionDone, minutes: quest.kind === 'repos' ? 0 : minutes },
    walks: { times: walkTimes(dog.walkTimes), done: walks.find((w) => w.date === today)?.done ?? {} },
  }
  const card = nowCard(input)
  const content = useCardContent(card)
  const next = nextLines(input, card)
  const questionnaire = questionnaireStatus(dog.questionnaire)

  return (
    <div className="flex flex-col gap-4 px-5">
      <header className="flex items-center gap-3">
        <Link to="/billy" aria-label={`Voir ${dog.name}`} className="shrink-0 overflow-hidden rounded-full border-[3px] border-solid border-milestone no-underline">
          <DogPhoto size={52} />
        </Link>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-medium text-muted">{formatDayHeading(today)}</span>
          <span className="font-display text-[24px] leading-tight font-extrabold">Bonjour</span>
        </span>
        <Link to="/boutique" aria-label={`${balance(bones)} os. Ouvrir la boutique`} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-gold-soft px-3.5 text-[17px] font-extrabold text-gold-dark no-underline">
          <BoneIcon size={20} />
          {balance(bones)}
        </Link>
      </header>

      <p className="text-[17px] leading-snug">{contextLine(input, card)}</p>

      <section aria-label="À faire maintenant" className="card flex flex-col gap-3 rounded-[26px] p-4">
        <span className="text-[13px] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">{content.badge}</span>
        {content.scene && <Illustration scene={content.scene} className="h-[130px] bg-bg" />}
        <h1 className="font-display text-[26px] leading-tight font-extrabold">{content.title}</h1>
        <p className="line-clamp-2 text-[17px] leading-snug text-[#3F4946]">{content.text}</p>
        {!content.action ? null : 'to' in content.action ? (
          <Link to={content.action.to!} className="btn btn-main min-h-[56px]">
            {content.action.label}
          </Link>
        ) : (
          <button type="button" onClick={content.action.run} className="btn btn-main min-h-[56px]">
            {content.action.label}
          </button>
        )}
        {content.other && (
          <button type="button" onClick={content.other.run} className="btn btn-quiet min-h-11 self-center px-4 text-[15px] text-primary">
            {content.other.label}
          </button>
        )}
      </section>

      {next.length > 0 && (
        <section aria-labelledby="ensuite" className="card flex flex-col p-0">
          <h2 id="ensuite" className="px-4 pt-3 text-[13px] font-extrabold tracking-[0.6px] text-muted uppercase">
            Ensuite
          </h2>
          {next.map((line, i) => (
            <Link key={line.key} to={line.to} className={`flex min-h-14 items-center gap-3 px-4 py-2.5 text-text no-underline ${i ? 'border-t border-divider' : ''}`}>
              <span className="w-16 shrink-0 text-[15px] font-bold text-primary">{line.when}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[17px] font-semibold">{line.title}</span>
                <span className="text-[15px] text-muted">{line.detail}</span>
              </span>
              <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
            </Link>
          ))}
        </section>
      )}

      <Link to="/noter" className="flex min-h-12 items-center justify-center gap-2 text-[17px] font-bold text-primary no-underline">
        <PlusIcon size={20} />
        Noter un souvenir
      </Link>
      {!questionnaire.complete && (
        <Link to="/questionnaire" className="text-center text-[15px] font-semibold text-muted underline">
          Terminer le questionnaire de départ
        </Link>
      )}

      <PasswordPrompt />
      <InstallBanner />
    </div>
  )
}
