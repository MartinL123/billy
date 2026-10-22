import { useState } from 'react'
import { BackLink } from '../../components/BackLink'
import { Link } from 'react-router-dom'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { formatAgeShort } from '../../lib/age'
import { progressFeed, trainingWeek } from '../../lib/billyPage'
import { sessionMinutes } from '../../lib/training-plan'
import { useQuest } from '../today/useQuest'
import { useBack } from '../../lib/useBack'
import { place } from '../../lib/garden'
import { useToday } from '../../lib/useToday'
import { DogPhoto } from '../shop/DogPhoto'
import { useReadOnly } from '../../firebase/viewer'
import { WeekCard } from './WeekCard'
import { LearningCard } from './LearningCard'
import { BadgeGrid } from './BadgeGrid'
import { ProgressList } from './ProgressList'

const FEED_SIZE = 4

/**
 * La page Billy (spec V6.1 § 10, T-104, maquette flair-2026-10-22/Billy) : d’abord ses entraînements.
 * Sa semaine, ce qu’il apprend (un chemin de 5 points par compétence), ses badges, ses progrès ;
 * « S’entraîner » fixé en bas, seul bouton orange ; « Changer ce qu’il apprend », seul contour.
 * Le reste (puce, véto, ce qui l’inquiète, réglages) est dans « Son profil ». Ni rang, ni boutique, ni meute (T-072).
 */
export default function Billy() {
  const readOnly = useReadOnly()
  const { dog, entries, xpLog, bossProgress } = useData()
  const today = useToday()
  const back = useBack('/')
  const { quest, minutes } = useQuest()

  const learning = activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress).slice(0, 3)
  // La première carte est ouverte par défaut ; une seule ouverte à la fois.
  const [selected, setSelected] = useState<string | undefined>(learning[0])
  const levels = Object.fromEntries(Object.entries(bossProgress).map(([id, p]) => [id, p?.level ?? 0]))
  const rests = xpLog.filter((e) => e.kind === 'repos').map((e) => e.date)
  const week = trainingWeek(today, entries, rests, (date) => sessionMinutes(dog.birthDate, date))
  const feed = progressFeed(entries, xpLog, bossProgress)
  const name = dog.unnamed ? 'Votre chien' : dog.name
  const age = dog.birthDate ? formatAgeShort(dog.birthDate, today) : ''
  // « S’entraîner » : la mission du jour si elle porte sur la compétence choisie, sinon un exercice de celle-ci.
  const train = selected && quest.bossId !== selected ? `/exercice?competence=${selected}` : '/mission'

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-[88px]">
      <BackLink label="Accueil" onClick={back} />

      <div className="card flex items-center justify-between gap-2.5 rounded-[20px] p-3">
        <div className="flex min-w-0 items-center gap-3">
          <DogPhoto size={60} />
          <div className="min-w-0">
            <h1 className="m-0 truncate font-display text-[1.4118rem] leading-tight font-semibold">{name}</h1>
            {age && <p className="m-0 text-muted">{age}</p>}
          </div>
        </div>
        <Link to="/profil" className="tap flex min-h-11 shrink-0 items-center rounded-full bg-primary-soft px-3.5 text-[0.8235rem] font-bold whitespace-nowrap text-primary no-underline">
          Son profil ›
        </Link>
      </div>

      <WeekCard week={week} />

      <section aria-labelledby="apprend" className="flex flex-col gap-3.5">
        <h2 id="apprend" className="title-section mt-1">
          {place('Ce qu’il apprend')}
        </h2>
        {learning.length === 0 && <p className="m-0 text-muted">Choisissez ce qu’il apprend en ce moment : la mission du jour en dépend.</p>}
        {learning.map((id) => (
          <LearningCard key={id} bossId={id} level={bossProgress[id]?.level ?? 0} open={selected === id} onToggle={() => setSelected(selected === id ? undefined : id)} />
        ))}
        {/* T-067 : choisir ses compétences en cours ; le seul bouton à contour de la page. */}
        {!readOnly && (
          <Link to="/en-cours" className="tap btn btn-outline min-h-12 whitespace-nowrap">
            {place('Changer ce qu’il apprend')}
          </Link>
        )}
      </section>

      <section aria-labelledby="badges" className="flex flex-col gap-3.5">
        <h2 id="badges" className="title-section mt-1">
          Ses badges
        </h2>
        <BadgeGrid levels={levels} active={learning} />
      </section>

      <section aria-labelledby="progres" className="flex flex-col gap-3.5">
        <h2 id="progres" className="title-section mt-1">
          Ses progrès
        </h2>
        <div className="card rounded-[20px] px-4 py-1">
          {feed.length ? (
            <>
              <ProgressList items={feed.slice(0, FEED_SIZE)} today={today} />
              {feed.length > FEED_SIZE && (
                <Link to="/billy/progres" className="btn-text flex w-full border-0 border-t border-solid border-divider no-underline">
                  Voir tous ses progrès
                </Link>
              )}
            </>
          ) : (
            <p className="m-0 py-3 text-[0.9412rem] text-muted">Ses étapes acquises et ses séances « Super » s’afficheront ici.</p>
          )}
        </div>
      </section>

      {/* L’action principale, fixée en bas au-dessus de la barre d’onglets (pas chez un visiteur). */}
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+108px)] z-10 mx-auto max-w-[430px] bg-gradient-to-b from-transparent to-bg to-35% px-4 pt-[18px] pb-2.5">
          <Link to={train} className="tap btn btn-main min-h-14 whitespace-nowrap">
            S’entraîner · {minutes}{' '}min
          </Link>
        </div>
      )}
    </div>
  )
}
