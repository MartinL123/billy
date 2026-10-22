import { useState } from 'react'
import type { CalmVote, Mark, Spot, WithId } from '../../firebase/community'
import { distanceMeters } from '../../lib/community'
import { formatLong } from '../../lib/dates'
import { SpotDetails } from '../meute/SpotDetails'

/** Un spot de la meute touché sur la carte (les idées « À découvrir » sont retirées, T-072). */
export type Selected = { spot: WithId<Spot>; mine: WithId<Mark>[] }

interface Props {
  selected: Selected
  here?: { lat: number; lng: number }
  me: string
  /** Avis et conseils de la meute, chiens passés cette semaine (gelé, T-072 : la carte ne les lit plus). */
  votes?: CalmVote[]
  dogs?: number
  onClose: () => void
  onRemove: (spot: WithId<Spot>, marks: WithId<Mark>[]) => void
}

/** La petite fenêtre d’un lieu touché sur la carte : la fiche du spot façon « Highlight » (V6 § 8.1), et « Retirer ». */
export function PlaceCard({ selected, here, me, votes = [], dogs = 0, onClose, onRemove }: Props) {
  const [confirm, setConfirm] = useState(false)
  const at = selected.spot

  return (
    <section aria-label={at.name} className="absolute inset-x-0 bottom-0 z-20 mx-auto flex max-h-[85%] max-w-[430px] animate-sheet flex-col gap-2.5 overflow-y-auto rounded-t-[26px] bg-surface px-5 pt-2 pb-9 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
      <div className="flex justify-end">
        <button type="button" onClick={onClose} aria-label="Fermer" className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-[1.2941rem] text-muted">
          ×
        </button>
      </div>
      <SpotDetails spot={at} votes={votes} dogs={dogs} meters={here ? distanceMeters(here, at) : undefined}>
        {selected.mine.length > 0 &&
          (confirm ? (
            <div className="flex flex-col gap-2 rounded-[18px] bg-bg p-3">
              <p className="text-[0.8824rem] leading-snug">{at.createdBy === me ? 'Le spot disparaît de la carte, pour toute la meute.' : 'Votre marque disparaît ; le spot reste pour la meute.'} Les os gagnés restent.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirm(false)} className="btn btn-outline min-h-12 flex-1">
                  Annuler
                </button>
                <button type="button" onClick={() => onRemove(at, selected.mine)} className="btn min-h-12 flex-1 bg-[#C4423A] text-white">
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <p className="text-[0.8824rem] text-muted">Marqué par vous le {formatLong(selected.mine[0]!.date)}.</p>
              <button type="button" onClick={() => setConfirm(true)} className="btn-text text-danger">
                Retirer ce spot
              </button>
            </div>
          ))}
      </SpotDetails>
    </section>
  )
}
