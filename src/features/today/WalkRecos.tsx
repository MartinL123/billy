import { Link } from 'react-router-dom'
import { ideaOnMap } from '../../lib/mapPanel'
import { formatRouteDistance } from '../../lib/route'
import type { WalkReco } from '../../lib/walkRecos'
import { RouteThumb } from '../trajets/RouteThumb'

/**
 * T-118 : « Idées pour maintenant », en bas de « Ses sorties du jour », quand c’est l’heure de sortir : 3 de ses balades
 * passées (mini-carte, nom, durée, distance, un mot de météo). Des cartes secondaires (l’orange reste à la carte du
 * moment) ; un toucher montre l’idée sur la carte des Balades. Sans idée : rien.
 */
export function WalkRecos({ recos }: { recos: WalkReco[] }) {
  if (recos.length === 0) return null
  return (
    <section aria-labelledby="idees-maintenant" className="flex flex-col gap-2 border-t border-solid border-divider pt-3">
      <h3 id="idees-maintenant" className="title-card">
        Idées pour maintenant
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {recos.map((reco) => (
          <li key={reco.item.id}>
            <Link
              to={ideaOnMap(reco.item.id)}
              state={{ retour: 'Accueil' }}
              aria-label={`${reco.item.name}, environ ${reco.minutes} minutes, ${formatRouteDistance(reco.item.route.distanceM)}${reco.hint ? `. ${reco.hint}` : ''}. La voir sur la carte`}
              className="tap grid min-h-16 grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-field bg-bg p-2 text-text no-underline"
            >
              <RouteThumb points={reco.item.route.points} size={56} />
              <span className="flex min-w-0 flex-col">
                <b className="truncate text-[0.9412rem] leading-snug">{reco.item.name}</b>
                <span className="text-[0.8235rem] leading-snug text-[#3F4946] tabular-nums">
                  ≈{' '}{reco.minutes}{' '}min · {formatRouteDistance(reco.item.route.distanceM)}
                </span>
                {reco.hint && <span className="text-[0.8235rem] leading-snug text-[#3F4946]">{reco.hint}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
