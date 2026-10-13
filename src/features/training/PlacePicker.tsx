import { useState } from 'react'
import type { Place, WithId } from '../../firebase/types'

export interface PlaceChoice {
  /** Lieu déjà enregistré. */
  id?: string
  /** Nom d'un nouveau lieu à créer. */
  name?: string
}

interface PlacePickerProps {
  legend: string
  places: WithId<Place>[]
  value: PlaceChoice
  onChange: (value: PlaceChoice) => void
  placeholder?: string
}

/** Choix d'un lieu du boss, ou saisie d'un nouveau (« La ruelle », « Parc des Docks »). */
export function PlacePicker({ legend, places, value, onChange, placeholder = 'La ruelle, le parc…' }: PlacePickerProps) {
  const [typing, setTyping] = useState(places.length === 0)
  const chip = (active: boolean) =>
    `min-h-11 rounded-full border-[1.5px] px-3.5 text-[15px] ${active ? 'border-primary bg-primary-soft font-bold text-primary-dark' : 'border-border bg-surface font-medium text-text'}`
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2.5 p-0 text-[15px] font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {places.map((place) => (
          <button
            key={place.id}
            type="button"
            aria-pressed={value.id === place.id}
            onClick={() => {
              setTyping(false)
              onChange(value.id === place.id ? {} : { id: place.id })
            }}
            className={chip(value.id === place.id)}
          >
            {place.name}
          </button>
        ))}
        {typing ? (
          <input
            aria-label="Nom du nouveau lieu"
            placeholder={placeholder}
            maxLength={40}
            enterKeyHint="done"
            value={value.name ?? ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-11 min-w-0 flex-1 rounded-full border-[1.5px] border-primary bg-surface px-3.5"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTyping(true)
              onChange({ name: '' })
            }}
            className="min-h-11 rounded-full border-[1.5px] border-dashed border-[#9AA39F] bg-transparent px-3.5 text-[15px] font-semibold text-primary"
          >
            + Nouveau lieu
          </button>
        )}
      </div>
    </fieldset>
  )
}

export const placeChosen = (choice: PlaceChoice) => Boolean(choice.id || choice.name?.trim())
