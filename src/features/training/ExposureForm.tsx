import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FormScreen } from '../../components/Form'
import { useToast } from '../../components/Toast'
import { bossById, BOSSES } from '../../content/training'
import { useData } from '../../firebase/store'
import { addPlace, recordExposure } from '../../firebase/training'
import type { DistanceBand } from '../../firebase/types'
import { REACTIONS } from '../../lib/session'
import { suggestedBosses } from '../../lib/traits'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { exposureXp } from '../../lib/xp'
import { PlacePicker, type PlaceChoice } from './PlacePicker'

const DISTANCES: { value: DistanceBand; label: string }[] = [
  { value: '>10', label: '+ de 10 m' },
  { value: '5-10', label: '5 à 10 m' },
  { value: '2-5', label: '2 à 5 m' },
  { value: '<2', label: '– de 2 m' },
]

/** Noter une exposition, voulue ou subie, en moins de 10 secondes. */
export default function ExposureForm() {
  const [params] = useSearchParams()
  const { dog, exposures, places } = useData()
  const today = useToday()
  const toast = useToast()
  const back = useBack('/dressage')

  // Les boss liés aux peurs d'abord, dans l'ordre conseillé pour le chien.
  const order = suggestedBosses(dog.traits ?? [])
  const bosses = [...BOSSES].sort((a, b) => Number(b.fear) - Number(a.fear) || order.indexOf(a.id) - order.indexOf(b.id))
  const [bossId, setBossId] = useState(() => bossById(params.get('boss') ?? '')?.id ?? exposures[0]?.bossId ?? bosses[0]!.id)
  const [place, setPlace] = useState<PlaceChoice>({})
  const [distance, setDistance] = useState<DistanceBand | undefined>()
  const [reaction, setReaction] = useState<number | null>(null)
  const [retreat, setRetreat] = useState(false)
  const [error, setError] = useState('')

  const bossPlaces = places.filter((p) => p.bossId === bossId)

  const save = () => {
    if (reaction === null) return setError('Indique sa réaction.')
    const name = place.name?.trim()
    const placeId = place.id ?? (name ? addPlace(name, bossId) : undefined)
    const trigger = bossPlaces.find((p) => p.id === place.id)?.name ?? name ?? bossById(bossId)!.name
    const xp = exposureXp(reaction, retreat)
    const { undo } = recordExposure({ date: today, bossId, placeId, trigger, distance, reaction, retreat, xp })
    toast(`Exposition notée · +${xp} XP`, { label: 'Annuler', run: undo })
    back()
  }

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border-[1.5px] px-3.5 text-[15px] ${active ? 'border-primary bg-primary-soft font-bold text-primary-dark' : 'border-border bg-surface font-medium text-text'}`

  return (
    <FormScreen title="Exposition" submitLabel="Enregistrer" onCancel={back} onSubmit={save}>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[15px] font-semibold">Quel boss ?</legend>
        <div className="flex flex-wrap gap-2">
          {bosses.map((boss) => (
            <button
              key={boss.id}
              type="button"
              aria-pressed={boss.id === bossId}
              onClick={() => {
                setBossId(boss.id)
                setPlace({})
              }}
              className={chip(boss.id === bossId)}
            >
              {boss.short}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[15px] font-semibold">Sa réaction</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {REACTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={reaction === r.value}
              aria-label={`${r.value} : ${r.label}. ${r.detail}`}
              onClick={() => {
                setReaction(r.value)
                setError('')
              }}
              className={`flex h-[68px] flex-col items-center justify-center gap-0.5 rounded-field border-[1.5px] px-0.5 ${reaction === r.value ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}
            >
              <span className="font-display text-2xl leading-none font-bold">{r.value}</span>
              <span className="text-[11px] leading-tight font-semibold">{r.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 min-h-5 text-[13px] text-muted">{reaction === null ? '0 : détendu · 4 : panique' : REACTIONS[reaction]?.detail}</p>
      </fieldset>

      <label className="flex min-h-[56px] items-center gap-3 rounded-field border-[1.5px] border-border bg-surface px-4">
        <input type="checkbox" checked={retreat} onChange={(e) => setRetreat(e.target.checked)} className="size-6 shrink-0 accent-primary" />
        <span className="flex flex-col py-2">
          <span className="text-base font-semibold">Retraite stratégique</span>
          <span className="text-[13px] text-muted">Demi-tour ou distance augmentée : la bonne réponse.</span>
        </span>
      </label>

      <PlacePicker legend="Lieu (option)" places={bossPlaces} value={place} onChange={setPlace} />

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[15px] font-semibold">
          Distance <span className="font-normal text-muted">(option)</span>
        </legend>
        <div className="grid grid-cols-4 gap-1 rounded-field bg-placeholder p-1">
          {DISTANCES.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={distance === d.value}
              onClick={() => setDistance(distance === d.value ? undefined : d.value)}
              className={`h-11 rounded-[10px] border-0 text-[13px] ${distance === d.value ? 'bg-surface font-bold text-text shadow-[0_1px_3px_rgba(24,32,30,0.12)]' : 'bg-transparent font-medium text-[#3F4946]'}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] leading-snug text-muted">Rester loin est très bien : la distance ne change jamais l'XP.</p>
      </fieldset>

      {error && (
        <div role="alert" className="text-sm font-medium text-danger">
          {error}
        </div>
      )}
    </FormScreen>
  )
}
