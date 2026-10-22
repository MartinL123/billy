import { BackLink } from '../../components/BackLink'
import { useBack } from '../../lib/useBack'
import { ImportFooter } from './ImportFooter'
import { APP_NAME } from '../../appName'

const STEPS: { title: string; text: string; link?: { label: string; href: string } }[] = [
  {
    title: 'Demandez votre archive à Strava',
    text: 'Sur strava.com : Paramètres › Mon compte › Télécharger ou supprimer votre compte › Demander votre archive. Strava vous envoie un lien par e-mail.',
    link: { label: 'Ouvrir Strava', href: 'https://www.strava.com/account' },
  },
  { title: 'Ouvrez le fichier zip dans Fichiers', text: 'L’iPhone le décompresse tout seul et crée un dossier.' },
  { title: 'Choisissez le dossier « activities »', text: `Sélectionnez tous les fichiers : ${APP_NAME} garde les marches et randonnées et ignore le reste.` },
]

/** « Importer vos balades Strava » (maquette V3-ImportStrava) : toute l’archive d’un coup. Jamais de connexion à Strava. */
export default function ImportStrava() {
  const back = useBack('/territoire')

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex items-center bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label="La carte" onClick={back} />
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+130px)]">
        <div className="flex flex-col gap-1">
          <h1 className="title-screen">Importer vos balades Strava</h1>
          <p className="text-[1rem] text-muted">Une fois par mois suffit. Les balades déjà importées sont sautées.</p>
        </div>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card flex items-start gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[1rem] font-bold text-white">{i + 1}</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="title-card">{step.title}</span>
                <span className="text-[0.8824rem] leading-snug text-[#3F4946]">{step.text}</span>
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
        <p className="rounded-field bg-primary-soft px-4 py-3 text-[0.8824rem] leading-snug text-primary-dark">{APP_NAME} garde le trajet et la durée. Le rythme cardiaque n’est jamais enregistré. Votre carte reste privée.</p>
      </main>
      <ImportFooter label="Choisir les fichiers" />
    </div>
  )
}
