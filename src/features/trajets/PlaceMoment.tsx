import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { ROUTE_MOMENTS, type RouteMoment } from '../../lib/route'
import { streetName } from '../../lib/street'
import { MomentIcon } from './momentIcons'

/** « Qu'est-ce qui s'est passé ici ? » : un repère sur le tracé, avec la rue si elle est connue. */
export function PlaceMoment({ at, onPlace, onCancel }: { at: { lat: number; lng: number }; onPlace: (type: RouteMoment['type'], note: string, street?: string) => void; onCancel: () => void }) {
  const [type, setType] = useState<RouteMoment['type'] | null>(null)
  const [note, setNote] = useState('')
  const [street, setStreet] = useState<string>()
  useEffect(() => {
    let live = true
    streetName(at.lat, at.lng).then((name) => live && setStreet(name))
    return () => {
      live = false
    }
  }, [at.lat, at.lng])
  // Une note libre n'a de sens qu'avec un mot.
  const ready = type !== null && (type !== 'note' || note.trim().length > 0)
  return (
    <Sheet label="Qu'est-ce qui s'est passé ici ?" onClose={onCancel}>
      <div className="mt-1 flex flex-col gap-0.5">
        <h2 className="font-display text-[22px] font-extrabold">Qu'est-ce qui s'est passé ici ?</h2>
        {street && <p className="text-[15px] font-semibold text-muted">{street}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ROUTE_MOMENTS.map((m) => {
          const on = type === m.id
          return (
            <button key={m.id} type="button" aria-pressed={on} onClick={() => setType(m.id)} className="flex min-h-14 items-center gap-2.5 rounded-[16px] border-[3px] border-solid px-2.5 text-left text-[16px] leading-tight font-extrabold" style={on ? { background: m.color, borderColor: m.color, color: '#FFFFFF' } : { background: '#FFFFFF', borderColor: m.color, color: m.color }}>
              <MomentIcon type={m.id} size={30} />
              {m.label}
            </button>
          )
        })}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold">
          Un mot {type === 'note' ? '' : <span className="font-normal text-muted">(facultatif)</span>}
        </span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === 'rencontre' ? 'Oslo, au bord de l’eau' : 'Un vélo est passé très près'} autoComplete="off" className="field" />
      </label>
      <button type="button" disabled={!ready} onClick={() => type && onPlace(type, note.trim(), street)} className="btn btn-main disabled:opacity-50">
        Placer ce repère
      </button>
    </Sheet>
  )
}
