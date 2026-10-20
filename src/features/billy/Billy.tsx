import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BoneIcon } from '../../components/BoneIcon'
import { ChevronLeftIcon, TargetIcon } from '../../components/Icons'
import { MAX_LEVEL } from '../../content/training'
import { bossById } from '../../content/training'
import { auth } from '../../firebase/app'
import { watchMembers } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { formatAgeShort, nextLifeStep } from '../../lib/age'
import { formatLong } from '../../lib/dates'
import { pawsLabel, skillPaws, STEPS, type PawState } from '../../lib/skillPaws'
import { stepPhrase } from '../../content/phrases'
import { useQuest } from '../today/useQuest'
import { balance } from '../../lib/bones'
import { reactionsFromFears } from '../../lib/questionnaire'
import { useBack } from '../../lib/useBack'
import { place, placeSkill } from '../../lib/garden'
import { useToday } from '../../lib/useToday'
import { DogPhoto } from '../shop/DogPhoto'
import { useReadOnly } from '../../firebase/viewer'

const capital = (text: string) => text.replace(/^./, (c) => c.toLocaleUpperCase('fr'))

/** Une patte (ou le trophée, pour la dernière étape) : dorée = acquise, pointillés qui respirent = en cours, grise = à venir. */
function Paw({ state, trophy }: { state: PawState; trophy: boolean }) {
  const color = state === 'acquise' ? { fill: '#F2B544', stroke: '#8A6514' } : state === 'en-cours' ? { fill: '#FCEFD3', stroke: '#8A6514' } : { fill: 'none', stroke: '#7D8783' }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={state === 'en-cours' ? 'paw-breathe' : ''}>
      {trophy ? (
        <path d="M8 4h8v4a4 4 0 0 1-8 0zM12 12v4M8 20h8M10 16h4" fill={state === 'acquise' ? '#F2B544' : 'none'} stroke={color.stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={state === 'en-cours' ? '2 2' : undefined} />
      ) : (
        <g fill={color.fill} stroke={color.stroke} strokeWidth={state === 'a-venir' ? 1.4 : 1.2} strokeDasharray={state === 'en-cours' ? '2 2' : undefined}>
          <ellipse cx="12" cy="16" rx="5" ry="4" />
          <circle cx="6" cy="10" r="2" />
          <circle cx="10" cy="6.5" r="2" />
          <circle cx="14" cy="6.5" r="2" />
          <circle cx="18" cy="10" r="2" />
        </g>
      )}
    </svg>
  )
}

/**
 * Billy (V5, T-052, maquette V5-Billy), ouvert depuis sa photo : ce qu’il apprend, en pattes et en prochaine étape
 * (jamais « 3 sur 5 ») ; une carte ouverte à la fois ; 4 tuiles ; « S’entraîner » fixé en bas.
 */
export default function Billy() {
  const readOnly = useReadOnly()
  const { dog, bossProgress, bones } = useData()
  const today = useToday()
  const back = useBack('/')
  const { quest, minutes } = useQuest()
  const [friends, setFriends] = useState(0)
  useEffect(() => watchMembers((members) => setFriends(members.filter((m) => m.id !== auth.currentUser?.uid).length)), [])

  const learning = activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress).slice(0, 3)
  // La première carte est ouverte par défaut ; une seule ouverte à la fois.
  const [selected, setSelected] = useState<string | undefined>(learning[0])
  const worries = (dog.reactions ?? reactionsFromFears(dog.fears ?? [])).filter((r) => r.reaction === 'peur' || r.reaction === 'inquiet').map((r) => r.situation)
  const step = dog.birthDate ? nextLifeStep(dog.birthDate, today) : undefined
  const age = [dog.birthDate ? formatAgeShort(dog.birthDate, today) : '', step ? `${step.label} le ${formatLong(step.date)}` : ''].filter(Boolean).join(' · ')
  const tiles = [
    { to: '/boutique', title: 'La boutique', detail: `${balance(bones)}\u00a0os à dépenser` },
    { to: '/meute', title: 'La meute', detail: friends ? `${friends} ami${friends > 1 ? 's' : ''} · les spots` : 'Les spots et les amis' },
    { to: '/profil', title: place('Ce qui l’inquiète'), detail: worries.length ? capital(worries.slice(0, 2).join(', ')) : 'Rien de noté' },
    { to: '/profil', title: 'Son profil', detail: 'Puce, véto, réglages' },
  ]
  // « S’entraîner » : la mission du jour si elle porte sur la compétence choisie, sinon un exercice de celle-ci.
  const train = selected && quest.bossId !== selected ? `/exercice?competence=${selected}` : '/mission'

  return (
    <div className="flex flex-col gap-4 px-5 pb-[88px]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="btn btn-quiet min-h-11 px-2">
          <ChevronLeftIcon size={20} />
          Accueil
        </button>
        <Link to="/boutique" data-bones-counter aria-label={`${balance(bones)} os. Ouvrir la boutique`} className="tap flex min-h-11 items-center gap-1.5 rounded-full bg-gold-soft px-3.5 text-[1rem] font-extrabold text-gold-dark no-underline">
          <BoneIcon size={20} />
          {balance(bones)}
        </Link>
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="overflow-hidden rounded-full border-4 border-solid border-milestone">
          <DogPhoto size={76} />
        </span>
        <h1 className="font-display text-[1.7647rem] leading-tight font-extrabold">{dog.unnamed ? 'Votre chien' : dog.name}</h1>
        {age && <p className="text-[0.9412rem] text-[#3F4946]">{age}</p>}
      </div>

      <section aria-labelledby="apprend" className="flex flex-col gap-2.5">
        <h2 id="apprend" className="font-display text-xl font-extrabold">
          {place('Ce qu’il apprend')}
        </h2>
        {learning.map((id) => {
          const level = bossProgress[id]?.level ?? 0
          const goal = (bossById(id)?.goal ?? '').replace(/\.$/, '')
          const open = selected === id
          const next = level < MAX_LEVEL ? stepPhrase(id, level + 1) : ''
          return (
            <div key={id} className={`card flex flex-col gap-2.5 rounded-[20px] border-2 border-solid px-4 py-3.5 ${open ? 'border-primary' : 'border-transparent'}`}>
              <button type="button" onClick={() => setSelected(open ? undefined : id)} aria-expanded={open} className="tap flex flex-col items-stretch gap-2.5 border-0 bg-transparent p-0 text-left text-text">
                <span className="text-[0.9412rem] leading-snug font-bold">{placeSkill(goal)}</span>
                {/* Une patte par étape, un trophée pour la dernière : aucun chiffre (décision du 20 oct.). */}
                <span role="img" aria-label={pawsLabel(level)} className="flex gap-1.5">
                  {skillPaws(level).map((state, k) => (
                    <Paw key={k} state={state} trophy={k === STEPS - 1} />
                  ))}
                </span>
              </button>
              {open && (
                <div className="anim-in flex flex-col gap-0.5 border-0 border-t border-solid border-[#E6EAE7] pt-2.5">
                  <span className="text-[0.7647rem] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">{next ? 'Prochaine étape' : 'Tout est acquis'}</span>
                  {next && <span className="text-[0.9412rem] text-[#3F4946]">{next}</span>}
                  <Link to={`/competence/${id}`} className="inline-flex min-h-11 items-center self-start text-[0.8824rem] font-bold text-primary no-underline">
                    Voir tout son chemin ›
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </section>

      <nav aria-label={`Tout sur ${dog.name}`} className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Link key={tile.title} to={tile.to} className="card tap flex min-h-[88px] flex-col gap-1 rounded-[20px] p-3.5 text-text no-underline">
            <span className="text-[0.9412rem] font-bold">{tile.title}</span>
            <span className="text-[0.8235rem] leading-snug text-[#3F4946]">{tile.detail}</span>
          </Link>
        ))}
      </nav>

      {/* L’action principale, fixée en bas au-dessus de la barre d’onglets (pas chez un visiteur). */}
      {!readOnly && (
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+108px)] z-10 mx-auto max-w-[430px] bg-gradient-to-b from-transparent to-bg to-40% px-4 pt-6 pb-3">
        <Link to={train} className="tap btn btn-main min-h-14 gap-2">
          <TargetIcon size={22} />
          S’entraîner · {minutes} min
        </Link>
      </div>
      )}
    </div>
  )
}
