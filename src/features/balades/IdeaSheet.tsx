import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { walkMinutes } from '../../lib/loops'
import { nextHourLine } from '../../lib/openMeteo'
import { formatRouteDistance } from '../../lib/route'
import { useNextHourWeather } from '../../lib/useNextHourWeather'
import { elevation } from '../../lib/walkHealth'
import type { WalkItem } from '../../lib/walkList'
import { isNative } from '../../native'

/** Le dénivelé gardé avec la balade, sinon calculé sur l’altitude de son trajet ; rien sans altitude. */
function ideaElevation(route: WalkItem['route']) {
  if (route.ascentM !== undefined || route.descentM !== undefined) return { ascentM: route.ascentM ?? 0, descentM: route.descentM ?? 0 }
  return elevation(route.track?.alt)
}

/**
 * T-118 : une idée de balade de l’Accueil, dans le panneau de la carte (son tracé en indigo au-dessus des autres) : le
 * nom, la durée estimée, la distance, la météo de l’heure qui vient, le dénivelé (s’il est connu) et, dans l’app iOS,
 * « Partir en balade » : la balade en cours garde ce tracé en pointillés (comme les boucles, T-089).
 */
export function IdeaSheet({ item, backLabel, onBack, weatherAt, halfRef }: { item: WalkItem; backLabel: string; onBack: () => void; /** Où lire la météo (la même position que l’Accueil : une requête par heure). */ weatherAt?: { lat: number; lng: number }; /** Le bas de l’action : ce que montre le panneau au cran du milieu. */ halfRef: Ref<HTMLDivElement> }) {
  const weather = useNextHourWeather(weatherAt)
  const elev = ideaElevation(item.route)
  const rows = [...(weather ? [{ label: 'Météo dans l’heure', value: nextHourLine(weather) }] : []), ...(elev ? [{ label: 'Dénivelé', value: `+${elev.ascentM} m · −${elev.descentM} m` }] : [])]
  return (
    <div className="flex flex-col gap-3">
      <BackLink label={backLabel} onClick={onBack} className="-mt-1 -mb-2" />
      <div className="flex flex-col gap-1">
        <span className="surtitre text-route-idea">Idée de balade</span>
        <h1 className="title-screen">{item.name}</h1>
        <p className="text-[1rem] leading-snug text-muted tabular-nums">
          ≈{' '}{walkMinutes(item.route)}{' '}min · {formatRouteDistance(item.route.distanceM)}
        </p>
      </div>
      {rows.length > 0 && (
        <dl className="m-0 grid grid-cols-2 gap-2">
          {rows.map((row) => (
            <div key={row.label} className="flex min-w-0 flex-col gap-0.5 rounded-field bg-bg px-3 py-2.5">
              <dt className="text-[0.7647rem] font-bold text-[#3F4946]">{row.label}</dt>
              <dd className="m-0 text-[0.9412rem] leading-snug font-bold">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {isNative() && (
        <Link to={`/balade-en-cours?depart=1&boucle=${encodeURIComponent(item.id)}`} className="tap btn btn-main min-h-[56px]">
          Partir en balade
        </Link>
      )}
      <div ref={halfRef} aria-hidden="true" className="h-0" />
    </div>
  )
}
