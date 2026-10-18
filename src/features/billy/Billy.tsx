import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'
import { MAX_LEVEL } from '../../content/training'
import { bossById } from '../../content/training'
import { auth } from '../../firebase/app'
import { watchMembers } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { formatAgeShort } from '../../lib/age'
import { balance } from '../../lib/bones'
import { reactionsFromFears } from '../../lib/questionnaire'
import { useBack } from '../../lib/useBack'
import { place, placeSkill } from '../../lib/garden'
import { useToday } from '../../lib/useToday'
import { DogPhoto } from '../shop/DogPhoto'

const capital = (text: string) => text.replace(/^./, (c) => c.toLocaleUpperCase('fr'))

/** Billy (spec V4 § 6) : ouvert depuis sa photo. Ce qu’il apprend, en phrases simples ; le reste en 4 lignes. */
export default function Billy() {
  const { dog, bossProgress, bones } = useData()
  const today = useToday()
  const back = useBack('/')
  const [friends, setFriends] = useState(0)
  useEffect(() => watchMembers((members) => setFriends(members.filter((m) => m.id !== auth.currentUser?.uid).length)), [])

  const learning = activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress).slice(0, 3)
  const worries = (dog.reactions ?? reactionsFromFears(dog.fears ?? [])).filter((r) => r.reaction === 'peur' || r.reaction === 'inquiet').map((r) => r.situation)
  const lines = [
    { to: '/profil', title: 'Ce qui l’inquiète', detail: worries.length ? capital(worries.slice(0, 3).join(', ')) : 'Rien de noté pour l’instant' },
    { to: '/boutique', title: `${balance(bones)} os · la boutique`, detail: 'Gagnés avec les missions et les balades' },
    { to: '/meute', title: 'Ses amis de la meute', detail: friends ? `${friends} ami${friends > 1 ? 's' : ''} · les spots` : 'Les spots et les amis' },
    { to: '/profil', title: 'Son identité, vos réglages', detail: 'Puce, véto, notifications, compte' },
  ]

  return (
    <div className="flex flex-col gap-5 px-5">
      <button type="button" onClick={back} className="btn btn-quiet min-h-11 self-start px-2">
        <ChevronLeftIcon size={20} />
        Aujourd’hui
      </button>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="overflow-hidden rounded-full border-4 border-solid border-milestone">
          <DogPhoto size={128} />
        </span>
        <h1 className="font-display text-[32px] leading-tight font-extrabold">{dog.unnamed ? 'Votre chien' : dog.name}</h1>
        <p className="text-[17px] text-muted">{[dog.birthDate ? formatAgeShort(dog.birthDate, today) : '', dog.breed].filter(Boolean).join(' · ')}</p>
      </div>

      <section aria-labelledby="apprend" className="flex flex-col gap-2.5">
        <h2 id="apprend" className="font-display text-xl font-extrabold">
          {place('Ce qu’il apprend en ce moment')}
        </h2>
        <div className="card flex flex-col p-0">
          {learning.map((id, i) => {
            const level = bossProgress[id]?.level ?? 0
            const goal = (bossById(id)?.goal ?? '').replace(/\.$/, '')
            return (
              <Link key={id} to={`/competence/${id}`} className={`flex items-center gap-3 px-4 py-3 text-text no-underline ${i ? 'border-t border-divider' : ''}`}>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-[17px] leading-snug font-semibold">{placeSkill(goal)}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-placeholder" aria-hidden="true">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${(level / MAX_LEVEL) * 100}%` }} />
                    </span>
                    <span className="shrink-0 text-[15px] font-bold text-muted">
                      {level} sur {MAX_LEVEL}
                    </span>
                  </span>
                </span>
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              </Link>
            )
          })}
        </div>
        <Link to="/billy/arbre" className="btn btn-outline">
          Voir tout son chemin
        </Link>
      </section>

      <nav aria-label={`Tout sur ${dog.name}`} className="card flex flex-col p-0">
        {lines.map((line, i) => (
          <Link key={line.title} to={line.to} className={`flex min-h-[60px] items-center gap-3 px-4 py-2.5 text-text no-underline ${i ? 'border-t border-divider' : ''}`}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[17px] font-bold">{line.title}</span>
              <span className="truncate text-[15px] text-muted">{line.detail}</span>
            </span>
            <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
          </Link>
        ))}
      </nav>
    </div>
  )
}
