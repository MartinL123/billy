import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stats } from '../../components/Stats'
import { useData } from '../../firebase/store'
import { readRoute } from '../../lib/route'
import { recapStats, stopChips, stopsLine } from '../../lib/walkRecap'
import { discoverySentence, walkDiscovery } from '../../lib/walkSheet'
import { tellQueue } from '../../lib/walkTell'

/**
 * Le panneau du récap « Belle balade ! » (V6 § 6.3), après « Terminer » (GPS de Flair) ou à l’arrivée d’une balade de
 * la Watch : surtitre, une phrase, Stats (distance · % découvert gagné · os), les arrêts et « Raconter la balade » ;
 * sans arrêt à raconter, « Voir son territoire » et « Ajouter un souvenir », comme avant.
 * `fallback` : ce qu’on sait déjà si la balade n’est pas encore lue dans la base locale.
 */
export function WalkRecap({ entryId, overline, subtitle, bones, fallback }: { entryId: string; overline?: string; subtitle?: string; bones?: number; fallback: { distanceM: number } }) {
  const { dog, entries, communes, bones: allBones } = useData()
  const navigate = useNavigate()
  const entry = entries.find((e) => e.id === entryId)
  const route = useMemo(() => readRoute(entry?.route), [entry?.route])
  const discovery = useMemo(() => (entry ? walkDiscovery(entryId, entries, communes) : undefined), [entryId, entries, communes, Boolean(entry)]) // eslint-disable-line react-hooks/exhaustive-deps
  // Les os de la note de cette balade (+3, dans la limite du jour), sauf si l’écran les connaît déjà.
  const gained = bones ?? allBones.filter((b) => b.reason === 'note' && b.refId === entryId).reduce((s, b) => s + b.amount, 0)
  // T-086 : les arrêts sans repère et les repères « À raconter ».
  const queue = route ? tellQueue(route) : []
  const untold = queue.length
  const stops = route?.stops?.length ?? 0
  const go = (to: string) => navigate(to, { replace: true })

  return (
    <section aria-label="Belle balade" className="animate-sheet flex flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
      <div className="flex flex-col items-center gap-1 text-center">
        {overline && <span className="surtitre text-milestone-dark">{overline}</span>}
        <h1 className="title-screen">Belle balade !</h1>
        <p className="text-[0.9412rem] text-[#3F4946]">{discovery ? discoverySentence(dog.name, discovery.newCells) : `Avec ${dog.name}`}{subtitle ? ` · ${subtitle}` : ''}</p>
      </div>
      <Stats items={recapStats({ distanceM: route?.distanceM ?? fallback.distanceM, discovery, bones: gained })} className="rounded-[16px] bg-bg px-4 py-3" />
      {untold > 0 && route ? (
        <>
          <p className="text-[0.9412rem] font-bold">{stopsLine(stops, queue.filter((q) => q.kind === 'marker').length)}</p>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {stopChips(route).map((chip) => (
              <li key={chip.label} className={`rounded-full px-3 py-1.5 text-[0.8235rem] font-bold ${chip.todo ? 'bg-primary-soft text-primary-dark' : chip.hard ? 'bg-danger-soft text-danger' : 'bg-bg text-text'}`}>
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
          <button type="button" onClick={() => go(`/territoire?balade=${encodeURIComponent(entryId)}`)} className="btn btn-main mt-1 min-h-14">
            Voir son territoire
          </button>
          <button type="button" onClick={() => go(`/souvenir/${entryId}/modifier`)} className="btn-text self-center px-4">
            Ajouter un souvenir
          </button>
        </>
      )}
    </section>
  )
}
