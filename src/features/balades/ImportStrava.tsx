import { ChevronLeftIcon } from '../../components/Icons'
import { useBack } from '../../lib/useBack'
import { ImportFooter } from './ImportFooter'

const STEPS: { title: string; text: string; link?: { label: string; href: string } }[] = [
  {
    title: 'Demandez votre archive à Strava',
    text: 'Sur strava.com : Paramètres › Mon compte › Télécharger ou supprimer votre compte › Demander votre archive. Strava vous envoie un lien par e-mail.',
    link: { label: 'Ouvrir Strava', href: 'https://www.strava.com/account' },
  },
  { title: 'Ouvrez le fichier zip dans Fichiers', text: 'L’iPhone le décompresse tout seul et crée un dossier.' },
  { title: 'Choisissez le dossier « activities »', text: 'Sélectionnez tous les fichiers : Billy garde les marches et randonnées et ignore le reste.' },
]

/** « Importer vos balades Strava » (maquette V3-ImportStrava) : toute l’archive d’un coup. Jamais de connexion à Strava. */
export default function ImportStrava() {
  const back = useBack('/territoire')

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          La carte
        </button>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+130px)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] leading-tight font-extrabold">Importer vos balades Strava</h1>
          <p className="text-[17px] text-muted">Une fois par mois suffit. Les balades déjà importées sont sautées.</p>
        </div>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card flex items-start gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[17px] font-extrabold text-white">{i + 1}</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[17px] font-bold">{step.title}</span>
                <span className="text-[15px] leading-snug text-[#3F4946]">{step.text}</span>
                {step.link && (
                  <a href={step.link.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 self-start font-bold text-primary underline">
                    {step.link.label}
                    <span className="sr-only">(nouvel onglet)</span>
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
        <p className="rounded-[18px] bg-primary-soft px-4 py-3 text-[15px] leading-snug text-primary-dark">Billy garde le trajet et la durée. Le rythme cardiaque n’est jamais enregistré. Votre carte reste privée.</p>
      </main>
      <ImportFooter label="Choisir les fichiers" />
    </div>
  )
}
