import { useNavigate } from 'react-router-dom'
import { BoneIcon } from '../../components/BoneIcon'
import { useData } from '../../firebase/store'

const POINTS = [
  { icon: '🎯', title: 'Sa mission du jour', text: 'Sur l’accueil : une chose à faire, quelques minutes, pas à pas.' },
  { icon: '🗺️', title: 'Ses balades', text: 'Importez vos balades Strava : le brouillard se lève sur la carte.' },
  { icon: '💉', title: 'Sa santé', text: 'Vaccins, vermifuge, pesées : l’app vous rappelle quand c’est le moment.' },
]

/** Écran de bienvenue, après les questions du départ (T-011) : l’app en 3 points, puis l’accueil. */
export default function Welcome() {
  const { dog } = useData()
  const navigate = useNavigate()
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pt-[calc(env(safe-area-inset-top)+40px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <h1 className="font-display text-[30px] leading-tight font-extrabold">Bienvenue, {dog.name} !</h1>
      <p className="mt-2 text-[17px] leading-snug text-[#3F4946]">Voici ce que vous allez faire ensemble.</p>
      <ul className="m-0 mt-7 flex list-none flex-col gap-4 p-0">
        {POINTS.map((p) => (
          <li key={p.title} className="card flex items-start gap-3.5 rounded-[20px] p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[24px]" aria-hidden="true">
              {p.icon}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[17px] font-bold">{p.title}</span>
              <span className="text-[15px] leading-snug text-muted">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-center gap-2 text-[15px] leading-snug text-muted">
        <BoneIcon size={18} className="shrink-0" />
        Le reste de son profil se complète plus tard, depuis l’accueil, et rapporte des os.
      </p>
      <button type="button" onClick={() => navigate('/', { replace: true })} className="btn btn-main mt-auto min-h-[56px]">
        C’est parti
      </button>
    </main>
  )
}
