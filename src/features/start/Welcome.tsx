import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BoneIcon } from '../../components/BoneIcon'
import { useData } from '../../firebase/store'
import { awardBone } from '../../firebase/training'
import { welcomeBone } from '../../lib/bones'
import { useToday } from '../../lib/useToday'

const points = () => [
  { icon: '🎯', title: 'Sa mission du jour', text: 'Sur l’accueil : une chose à faire, quelques minutes, pas à pas.' },
  { icon: '🗺️', title: 'Ses balades', text: 'Importez vos balades Strava : le brouillard se lève sur la carte.' },
  { icon: '💉', title: 'Sa santé', text: 'Vaccins, vermifuge, pesées : l’app vous rappelle quand c’est le moment.' },
]

/** Écran de bienvenue, après les questions du départ (T-011) : l’app en 3 points, puis l’accueil. */
export default function Welcome() {
  const { dog, bones } = useData()
  const navigate = useNavigate()
  const today = useToday()
  // +10 os pour bien commencer (R-035), une seule fois : l’identifiant est fixe.
  const gift = welcomeBone(today)
  const given = bones.some((b) => b.id === gift.id)
  useEffect(() => {
    if (!given) awardBone(gift)
    // Une fois, à l’arrivée sur l’écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pt-[calc(env(safe-area-inset-top)+40px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <h1 className="title-screen">{dog.unnamed ? 'Bienvenue !' : `Bienvenue, ${dog.name} !`}</h1>
      <p className="mt-2 text-[1rem] leading-snug text-[#3F4946]">Voici ce que vous allez faire ensemble.</p>
      <span className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-gold-soft px-3.5 py-2 text-[0.9412rem] font-bold text-gold-dark">
        <BoneIcon size={20} />+{gift.amount} os pour bien commencer
      </span>
      <ul className="m-0 mt-7 flex list-none flex-col gap-4 p-0">
        {points().map((p) => (
          <li key={p.title} className="card flex items-start gap-3.5 rounded-[20px] p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[1.4118rem]" aria-hidden="true">
              {p.icon}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="title-card">{p.title}</span>
              <span className="text-[0.8824rem] leading-snug text-muted">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[0.8824rem] leading-snug text-muted">Le reste de son profil se complète plus tard, depuis l’accueil.</p>
      <button type="button" onClick={() => navigate('/', { replace: true })} className="btn btn-main mt-auto min-h-[56px]">
        C’est parti
      </button>
    </main>
  )
}
