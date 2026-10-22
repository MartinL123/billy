import { useEffect, useState, type ReactNode } from 'react'
import type { Bytes } from 'firebase/firestore'
import { Stats } from '../../components/Stats'
import type { CalmVote, Spot, WithId } from '../../firebase/community'
import { categoryInfo } from '../../lib/community'
import { formatLong } from '../../lib/dates'
import { directionsUrl } from '../../lib/ideas'
import { goLabel, spotPills, spotStats, spotTips } from '../../lib/spots'

/** La photo du spot (miniature gardée dans le spot), sur toute la largeur. */
function SpotPhoto({ photo, name }: { photo: Bytes; name: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const created = URL.createObjectURL(new Blob([photo.toUint8Array() as BlobPart], { type: 'image/jpeg' }))
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [photo])
  return <div className="h-[min(168px,22dvh)] shrink-0 overflow-hidden rounded-[18px] bg-placeholder">{url && <img src={url} alt={`Photo du spot ${name}`} className="size-full object-cover" />}</div>
}

interface Props {
  spot: WithId<Spot>
  /** Les avis de calme et conseils de la meute pour ce spot. */
  votes: CalmVote[]
  /** Chiens passés cette semaine. */
  dogs: number
  /** Distance d’ici (position déjà autorisée), sinon rien. */
  meters?: number
  /** Ce qui vient après « Y aller » : avis, Marquer, Retirer… (actions secondaires). */
  children?: ReactNode
}

/**
 * La fiche d’un spot façon « Highlight » (spec V6 § 8.1, T-088), dans cet ordre : photo, surtitre catégorie, nom,
 * Stats (calme et moment · chiens cette semaine · distance), conseils de la meute, pastilles d’infos, puis
 * « Y aller · 8 min à pied » (la seule action orange). Rien de vide : un bloc sans donnée n’apparaît pas.
 */
export function SpotDetails({ spot, votes, dogs, meters, children }: Props) {
  const info = categoryInfo(spot.category)
  const tips = spotTips(votes)
  const pills = spotPills(spot.info)
  return (
    <div className="flex flex-col gap-3.5">
      {spot.photo && <SpotPhoto photo={spot.photo} name={spot.name} />}
      <div className="flex flex-col gap-0.5">
        <span className={`surtitre ${info.id === 'eviter' ? 'text-danger' : 'text-primary'}`}>
          {info.label}
        </span>
        <h2 className="title-section">{spot.name}</h2>
      </div>
      <Stats items={spotStats({ votes, dogs, meters })} />
      {tips.length > 0 && (
        <section aria-label="Conseils de la meute" className="flex flex-col gap-2">
          <h3 className="text-muted surtitre">Conseils de la meute</h3>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {tips.map((t) => (
              <li key={`${t.by}-${t.date}`} className="flex flex-col gap-0.5">
                <p className="m-0 text-[1rem] leading-snug">« {t.text} »</p>
                <p className="m-0 text-[0.8235rem] text-muted">
                  {t.by} · {formatLong(t.date)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {pills.length > 0 && (
        <ul aria-label="Infos" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {pills.map((i) => (
            <li key={i} className="rounded-full bg-primary-soft px-3 py-1 text-[0.8824rem] font-semibold text-primary-dark">
              {i}
            </li>
          ))}
        </ul>
      )}
      <a href={directionsUrl(spot.lat, spot.lng)} target="_blank" rel="noopener noreferrer" className="tap btn btn-main min-h-[56px]">
        {goLabel(meters)}
      </a>
      {children}
    </div>
  )
}
