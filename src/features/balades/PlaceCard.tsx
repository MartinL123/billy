import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Mark, Spot, WithId } from '../../firebase/community'
import { categoryInfo, distanceMeters } from '../../lib/community'
import { formatLong } from '../../lib/dates'
import { arrowTo, directionsUrl, KIND, metersLabel, osmUrl, stravaRouteUrl, type Idea } from '../../lib/ideas'

export type Selected = { kind: 'idea'; idea: Idea } | { kind: 'spot'; spot: WithId<Spot>; mine: WithId<Mark>[] }

interface Props {
  selected: Selected
  here?: { lat: number; lng: number }
  me: string
  onClose: () => void
  onRemove: (spot: WithId<Spot>, marks: WithId<Mark>[]) => void
}

const external = 'flex min-h-11 items-center gap-1 font-bold text-primary underline'

/** La petite fenêtre d’un lieu touché sur la carte : ce que c’est, s’il existe, et comment y aller. */
export function PlaceCard({ selected, here, me, onClose, onRemove }: Props) {
  const [confirm, setConfirm] = useState(false)
  const at = selected.kind === 'idea' ? selected.idea : selected.spot
  const distance = here ? `${arrowTo(here, at)} ${metersLabel(distanceMeters(here, at))}` : ''

  return (
    <section aria-label={at.name} className="absolute inset-x-0 bottom-0 z-20 mx-auto flex max-w-[430px] animate-sheet flex-col gap-2.5 rounded-t-[26px] bg-surface px-5 pt-4 pb-9 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg text-[22px]" aria-hidden="true">
          {selected.kind === 'idea' ? (selected.idea.explored ? KIND[selected.idea.kind].icon : '?') : selected.mine.length ? '💧' : '🐾'}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">
            {selected.kind === 'idea' ? KIND[selected.idea.kind].label : categoryInfo(selected.spot.category).label}
            {distance && ` · ${distance}`}
          </span>
          <h2 className="font-display text-[22px] leading-tight font-extrabold">{at.name}</h2>
        </span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-[22px] text-muted">
          ×
        </button>
      </div>

      {selected.kind === 'idea' ? (
        <>
          <p className="text-[17px] leading-snug text-[#3F4946]">{selected.idea.explored ? `Déjà dans son territoire${selected.idea.discoveredOn ? ` depuis le ${formatLong(selected.idea.discoveredOn)}` : ''}.` : `Encore dans le brouillard. ${selected.idea.reason}`}</p>
          {selected.idea.dogsBanned && <p className="rounded-[14px] bg-[#FDECEA] px-3 py-2 text-[15px] font-semibold text-[#8E2B23]">Chiens interdits d’après OpenStreetMap.</p>}
          <a href={osmUrl(selected.idea.id)} target="_blank" rel="noopener noreferrer" className={`${external} text-[15px]`}>
            Répertorié sur OpenStreetMap : voir la fiche
          </a>
          <div className="flex gap-2">
            <a href={directionsUrl(at.lat, at.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-main min-h-[52px] flex-1">
              Y aller
            </a>
            <a href={stravaRouteUrl(at.lat, at.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-[52px] flex-1">
              Préparer sur Strava
            </a>
          </div>
          <Link to="/territoire/idees" className="flex min-h-11 items-center justify-center text-[15px] font-bold text-primary">
            Autres idées de balade
          </Link>
        </>
      ) : (
        <>
          <p className="text-[17px] leading-snug text-[#3F4946]">
            {selected.mine.length ? `Marqué par vous le ${formatLong(selected.mine[0]!.date)}.` : 'Un spot partagé par la meute.'}
            {selected.spot.info.length > 0 && ` ${selected.spot.info.slice(0, 2).join(' · ')}`}
          </p>
          {selected.mine.length > 0 ? (
            confirm ? (
              <div className="flex flex-col gap-2 rounded-[18px] bg-bg p-3">
                <p className="text-[15px] leading-snug">{selected.spot.createdBy === me ? 'Le spot disparaît de la carte, pour toute la meute.' : 'Votre marque disparaît ; le spot reste pour la meute.'} Les os gagnés restent.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirm(false)} className="btn btn-outline min-h-12 flex-1">
                    Annuler
                  </button>
                  <button type="button" onClick={() => onRemove(selected.spot, selected.mine)} className="btn min-h-12 flex-1 bg-[#C4423A] text-white">
                    Retirer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <a href={directionsUrl(at.lat, at.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-main min-h-[52px] flex-1">
                  Y aller
                </a>
                <button type="button" onClick={() => setConfirm(true)} className="btn btn-outline min-h-[52px] flex-1">
                  Retirer ce spot
                </button>
              </div>
            )
          ) : (
            <div className="flex gap-2">
              <a href={directionsUrl(at.lat, at.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-main min-h-[52px] flex-1">
                Y aller
              </a>
              <Link to={`/meute?spot=${selected.spot.id}`} className="btn btn-outline min-h-[52px] flex-1">
                Voir le spot
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  )
}
