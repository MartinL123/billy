import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { useBack } from '../../lib/useBack'
import { ImportFooter } from './ImportFooter'

/** Ses activités sur strava.com : la dernière balade est en haut de la liste. */
const STRAVA_ACTIVITIES = 'https://www.strava.com/athlete/training'

/**
 * « Ajouter la dernière balade » (maquette V3-AjouterStrava) : ouvrir ses activités Strava, exporter le GPX,
 * choisir le fichier. Billy ne se connecte jamais à Strava : il lit seulement le fichier exporté.
 */
export default function AddWalk() {
  const back = useBack('/territoire')
  const steps = [
    { title: 'Ouvrez vos activités Strava', text: 'Dans Safari, touchez votre dernière balade.' },
    { title: 'Touchez ⋯ puis « Exporter GPX »', text: 'Le fichier arrive dans vos Téléchargements.' },
    { title: 'Revenez ici et choisissez le fichier', text: 'Billy ajoute la balade au Carnet et lève le brouillard.' },
  ]

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          Retour
        </button>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+130px)]">
        <h1 className="font-display text-[28px] leading-tight font-extrabold">Ajouter la dernière balade</h1>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {steps.map((step, i) => (
            <li key={step.title} className="card flex items-start gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[17px] font-extrabold text-white">{i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[17px] font-bold">{step.title}</span>
                <span className="text-[15px] leading-snug text-[#3F4946]">{step.text}</span>
                {i === 0 && (
                  <a href={STRAVA_ACTIVITIES} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-2 min-h-12 w-full">
                    Ouvrir mes activités Strava
                    <span className="sr-only">(nouvel onglet)</span>
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-[15px] leading-snug text-muted">Si c’est l’app Strava qui s’ouvre : elle ne sait pas exporter. Ouvrez plutôt strava.com dans Safari.</p>
        <p className="rounded-[18px] bg-primary-soft px-4 py-3 text-[15px] leading-snug text-primary-dark">Billy ne se connecte jamais à votre compte Strava : c’est vous qui exportez, Billy lit seulement le fichier.</p>
        <Link to="/importer" className="flex min-h-12 items-center text-[17px] font-bold text-primary">
          Plusieurs balades ? Importer toute l’archive
        </Link>
      </main>
      <ImportFooter label="Choisir le fichier" multiple={false} />
    </div>
  )
}
