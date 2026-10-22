import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { Stats } from '../../components/Stats'
import { formatDuration } from '../../lib/balade'
import type { ISODate } from '../../lib/dates'
import { pickLoops } from '../../lib/loops'
import { formatRouteDistance } from '../../lib/route'
import type { WalkItem } from '../../lib/walkList'
import { RouteThumb } from '../trajets/RouteThumb'

/**
 * « Boucles pour Billy » (spec V6 § 8.2, T-089) : jusqu’à 3 de ses balades passées qui partent à moins de 300 m d’ici,
 * une par durée (≈ 15, 30, 45 min). Sans position, ou sans balade qui parte d’ici : rien (jamais de bloc vide).
 */
export function LoopsBlock({ walks, here, known, dogName, birthDate, today }: { walks: WalkItem[]; here: { lat: number; lng: number }; known: Set<string>; dogName: string; birthDate?: ISODate; today: ISODate }) {
  const loops = useMemo(() => pickLoops(walks, here, known, { birthDate, today }), [walks, here.lat, here.lng, known, birthDate, today]) // eslint-disable-line react-hooks/exhaustive-deps
  if (loops.length === 0) return null
  return (
    <section aria-labelledby="boucles-titre" className="flex flex-col gap-2">
      <h2 id="boucles-titre" className="title-card">
        Boucles pour {dogName}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {loops.map((loop) => (
          <li key={loop.item.id}>
            <Link to={`/boucle/${encodeURIComponent(loop.item.id)}`} className="tap flex items-center gap-3 rounded-[16px] border-2 border-solid border-[#E6EAE7] bg-surface px-3 py-2.5 text-text no-underline">
              <RouteThumb points={loop.item.route.points} size={56} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-primary surtitre">
                  ≈ {loop.duration}
                  {' '}min · {loop.level}
                </span>
                <span className="title-card truncate">{loop.item.name}</span>
                <Stats items={[{ value: formatRouteDistance(loop.item.route.distanceM), label: 'Distance' }, { value: formatDuration(loop.minutes), label: 'Durée' }]} />
              </span>
              <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
