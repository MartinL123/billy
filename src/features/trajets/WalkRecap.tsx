import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stats } from '../../components/Stats'
import { useData } from '../../firebase/store'
import { readRoute } from '../../lib/route'
import { recapStats, sniffLine, stopChips, stopsLine } from '../../lib/walkRecap'
import { importNewStreets } from '../../lib/walkFacts'
import { place } from '../../lib/garden'
import { tellQueue } from '../../lib/walkTell'
import { dogName } from '../../lib/dogName'
import { RecapPhotos } from './RecapPhotos'

/**
 * Le panneau du récap « Belle balade ! » (V6 § 6.3), après « Terminer » (GPS de Flair) ou à l’arrivée d’une balade de
 * la Watch : surtitre, une phrase, Stats (distance · durée · nouvelles rues, plus d’os depuis la maquette du 22/10 ; V6.1 : plus de pourcentage découvert), les arrêts et « Raconter la balade » ;
 * sans arrêt à raconter, « Voir la balade » (sa fiche, T-098) et « Ajouter un souvenir ».
 * `fallback` : ce qu’on sait déjà si la balade n’est pas encore lue dans la base locale.
 */
export function WalkRecap({ entryId, overline, subtitle, fallback }: { entryId: string; overline?: string; subtitle?: string; fallback: { distanceM: number } }) {
  const { dog, entries } = useData()
  const navigate = useNavigate()
  const entry = entries.find((e) => e.id === entryId)
  const route = useMemo(() => readRoute(entry?.route), [entry?.route])
  // T-111 (maquette BelleBalade) : les nouvelles rues, dès qu’elles sont connues (elles arrivent après, avec le réseau).
  const newStreets = importNewStreets(route?.streets ? [{ streets: route.streets }] : [])
  const sniff = sniffLine(dogName(dog), newStreets)
  // T-086 : les arrêts sans repère et les repères « À raconter ».
  const queue = route ? tellQueue(route) : []
  const untold = queue.length
  const stops = route?.stops?.length ?? 0
  const go = (to: string) => navigate(to, { replace: true })

  return (
    <section aria-label="Belle balade" className="panel animate-sheet flex flex-col gap-3 px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
      <div className="flex flex-col items-center gap-1 text-center">
        {overline && <span className="surtitre text-milestone-dark">{overline}</span>}
        <h1 className="title-screen">Belle balade !</h1>
        <p className="text-[0.9412rem] text-[#3F4946]">{sniff ? place(sniff.charAt(0).toLocaleUpperCase('fr') + sniff.slice(1)) : `Avec ${dogName(dog)}${subtitle ? ` · ${subtitle}` : ''}`}</p>
      </div>
      <Stats items={recapStats({ distanceM: route?.distanceM ?? fallback.distanceM, ...(route?.durationMin ? { durationMin: route.durationMin } : {}), ...(newStreets !== undefined ? { newStreets } : {}) })} className="rounded-field bg-bg px-4 py-3" />
      {/* T-103 : les photos prises pendant la balade (app iOS, avec l’accord de la personne). */}
      {route && <RecapPhotos entryId={entryId} route={route} />}
      {untold > 0 && route ? (
        <>
          <p className="text-[0.9412rem] font-bold">{stopsLine(stops, queue.filter((q) => q.kind === 'marker').length)}</p>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {stopChips(route).map((chip) => (
              <li key={chip.label} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8235rem] font-bold ${chip.todo ? 'bg-primary-soft text-primary-dark' : chip.hard ? 'bg-danger-soft text-danger' : 'bg-bg text-text'}`}>
                {chip.label}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => go(`/souvenir/${entryId}/raconter`)} className="btn btn-main mt-1 min-h-14">
            Raconter la balade
          </button>
          <button type="button" onClick={() => go('/')} className="btn-text self-center px-4">
            Plus tard
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => go(`/souvenir/${encodeURIComponent(entryId)}`)} className="btn btn-main mt-1 min-h-14">
            Voir la balade
          </button>
          <button type="button" onClick={() => go(`/souvenir/${entryId}/modifier`)} className="btn-text self-center px-4">
            Ajouter un souvenir
          </button>
        </>
      )}
    </section>
  )
}
