import { useState } from 'react'
import { useToast } from '../../components/Toast'
import { updateEntryRoute } from '../../firebase/db'
import { routeMomentInfo, storeRoute, type Route, type RouteMomentType } from '../../lib/route'
import { STOP_TILES, tellMoment, type TellItem } from '../../lib/walkTell'
import { MomentIcon } from './momentIcons'
import { PlaceMoment } from './PlaceMoment'

/**
 * Poser un repère sur un arrêt (V6 § 6.2) : un toucher l’enregistre, un bandeau « Annuler » le retire (10 s).
 * Un repère « À raconter » (T-086) est remplacé par celui choisi ; « Annuler » le rend. Renvoie vrai si c’est fait.
 */
export function usePlaceOnStop(entryId: string, route: Route) {
  const toast = useToast()
  return (item: TellItem, type: RouteMomentType, note?: string): boolean => {
    const moments = tellMoment(route, item, type, note)
    if (!moments) return false
    const before = route.moments
    updateEntryRoute(entryId, storeRoute({ ...route, moments }))
    toast(`${routeMomentInfo(type).label} noté`, { label: 'Annuler', run: () => updateEntryRoute(entryId, storeRoute({ ...route, moments: before })) })
    return true
  }
}

/** Les 6 tuiles de 44 px : Pipi · Rencontre · Reniflage · Jeu · Moment de stress · Autre (le choix complet, avec un mot). */
export function StopTiles({ stop, onPick }: { stop: { lat: number; lng: number }; onPick: (type: RouteMomentType, note?: string) => void }) {
  const [other, setOther] = useState(false)
  return (
    <>
      <div className="@container">
      <div role="group" aria-label="Que s’est-il passé ici ?" className="grid grid-cols-2 gap-2 @min-[23rem]:grid-cols-3">
        {STOP_TILES.map((tile) => {
          const color = tile.type ? routeMomentInfo(tile.type).color : '#5C6662'
          return (
            <button key={tile.label} type="button" onClick={() => (tile.type ? onPick(tile.type) : setOther(true))} className="tap flex min-h-11 items-center gap-2 rounded-field border-2 border-solid bg-surface px-2 py-1.5 text-left text-[0.8235rem] leading-tight font-bold text-text" style={{ borderColor: `${color}66` }}>
              {tile.type ? <MomentIcon type={tile.type} size={24} /> : <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#5C6662] text-[0.8235rem] text-white">…</span>}
              {tile.label}
            </button>
          )
        })}
      </div>
      </div>
      {other && (
        <PlaceMoment
          at={stop}
          onCancel={() => setOther(false)}
          onPlace={(type, note) => {
            setOther(false)
            onPick(type, note || undefined)
          }}
        />
      )}
    </>
  )
}

/**
 * T-103 : le repère proposé (« Jeu ? », un long arrêt dans un parc), en pointillés : un toucher le confirme et
 * l’enregistre comme n’importe quelle tuile (bandeau « Annuler »). Tant qu’il n’est pas touché, rien n’est compté.
 */
export function SuggestedMoment({ type, place, onConfirm }: { type: RouteMomentType; place?: string; onConfirm: (type: RouteMomentType) => void }) {
  const info = routeMomentInfo(type)
  return (
    <button type="button" onClick={() => onConfirm(type)} aria-label={`Confirmer\u00a0: ${info.label}`} className="tap flex min-h-11 items-center gap-2 self-start rounded-full border-2 border-dashed bg-surface py-1 pr-3.5 pl-1 text-left text-[0.8824rem] leading-tight font-bold text-text" style={{ borderColor: `${info.color}99` }}>
      <MomentIcon type={type} size={28} />
      <span className="flex flex-col">
        <span>{`${info.label}\u00a0?`}</span>
        {place && <span className="text-[0.7647rem] font-medium text-muted">{`${place} · toucher pour confirmer`}</span>}
      </span>
    </button>
  )
}
