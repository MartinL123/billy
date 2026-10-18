import { ChevronLeftIcon } from '../../components/Icons'
import { APP_NAME } from '../../appName'

const APP_URL = 'martinl123.github.io/billy'

/** L’app est-elle ouverte depuis l’icône de l’écran d’accueil ? */
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

function Steps({ title, steps, note }: { title: string; steps: string[]; note?: string }) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[15px] leading-none font-extrabold text-white">{i + 1}</span>
            <span className="text-[17px] leading-7">{step}</span>
          </li>
        ))}
      </ol>
      {note && <p className="text-[15px] leading-snug text-muted">{note}</p>}
    </section>
  )
}

/** « Mettre Billy sur votre téléphone » (docs/specs/communaute.md § 2.1) : depuis la connexion et Profil › Compte. */
export function InstallGuide({ onBack, backLabel = 'Retour' }: { onBack: () => void; backLabel?: string }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={onBack} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          {backLabel}
        </button>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <h1 className="font-display text-[28px] leading-tight font-extrabold">Mettre {APP_NAME} sur votre téléphone</h1>
        <p className="text-[17px] leading-snug text-[#3F4946]">Pas besoin de magasin d’applications : on l’ajoute à l’écran d’accueil, comme une app.</p>
        <Steps
          title="Sur iPhone (Safari)"
          steps={[`Ouvrez ${APP_URL} dans Safari.`, 'Touchez Partager (le carré avec une flèche vers le haut).', 'Choisissez « Sur l’écran d’accueil ».', 'Touchez « Ajouter ».']}
          note="Le rappel du soir ne marche que depuis l’icône (iOS 16.4 ou plus récent)."
        />
        <Steps
          title="Sur Android (Chrome)"
          steps={[`Ouvrez ${APP_URL} dans Chrome.`, 'Touchez ⋮ en haut à droite.', 'Choisissez « Ajouter à l’écran d’accueil » ou « Installer l’application ».', 'Confirmez.']}
        />
      </main>
    </div>
  )
}
