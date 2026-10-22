import { useState } from 'react'
import { useToast } from '../../components/Toast'
import { updateEntryRoute } from '../../firebase/db'
import { routeMomentInfo, storeRoute, type Route, type RouteMomentType } from '../../lib/route'
import { momentOnStop, STOP_TILES } from '../../lib/walkTell'
import { MomentIcon } from './momentIcons'
import { PlaceMoment } from './PlaceMoment'

/**
 * Poser un repère sur un arrêt (V6 § 6.2) : un toucher l’enregistre, un bandeau « Annuler » le retire (10 s).
 * Renvoie vrai si le repère a été posé.
 */
export function usePlaceOnStop(entryId: string, route: Route) {
  const toast = useToast()
  return (stopIndex: number, type: RouteMomentType, note?: string): boolean => {
    const moments = momentOnStop(route, stopIndex, type, note)
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
            <button key={tile.label} type="button" onClick={() => (tile.type ? onPick(tile.type) : setOther(true))} className="tap flex min-h-11 items-center gap-2 rounded-[14px] border-2 border-solid bg-surface px-2 py-1.5 text-left text-[0.8235rem] leading-tight font-bold text-text" style={{ borderColor: `${color}66` }}>
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
