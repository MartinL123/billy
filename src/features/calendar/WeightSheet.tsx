import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { deleteWeight, newId, saveWeight } from '../../firebase/db'
import type { Weight, WithId } from '../../firebase/types'
import { formatShort, isValidISO, type ISODate } from '../../lib/dates'

export const formatKg = (kg: number) => kg.toFixed(1).replace('.', ',')

function parseKg(raw: string): number | undefined {
  const kg = Number(raw.trim().replace(',', '.'))
  return raw.trim() && Number.isFinite(kg) && kg > 0 && kg < 150 ? Math.round(kg * 100) / 100 : undefined
}

interface WeightSheetProps {
  today: ISODate
  weights: WithId<Weight>[]
  /** Pesée à corriger ; absente pour une nouvelle pesée. */
  editing?: WithId<Weight>
  onClose: () => void
}

/** Ajout rapide d'une pesée : poids (clavier numérique) + date. */
export function WeightSheet({ today, weights, editing, onClose }: WeightSheetProps) {
  const [raw, setRaw] = useState(editing ? formatKg(editing.kg) : '')
  const [date, setDate] = useState(editing?.date ?? today)
  const [error, setError] = useState('')

  const previous = weights.find((w) => w.id !== editing?.id && w.date <= date)
  const kg = parseKg(raw)
  const delta = kg !== undefined && previous ? Math.round((kg - previous.kg) * 100) / 100 : undefined

  const save = () => {
    if (kg === undefined) return setError('Entrez un poids en kilos, par exemple 11,8.')
    if (!isValidISO(date)) return setError('Choisissez une date.')
    saveWeight(editing?.id ?? newId('weights'), { date, kg })
    onClose()
  }

  return (
    <Sheet label={editing ? 'Modifier la pesée' : 'Ajouter une pesée'} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">{editing ? 'Modifier la pesée' : 'Nouvelle pesée'}</h2>
          {previous && <span className="text-sm text-muted">Dernière : {formatKg(previous.kg)} kg</span>}
        </div>

        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="kg" className="text-[15px] font-semibold">
              Poids
            </label>
            <div className="flex h-16 items-center gap-2 rounded-field border-2 border-primary bg-surface px-4">
              <input
                id="kg"
                type="text"
                inputMode="decimal"
                autoFocus
                autoComplete="off"
                placeholder="0,0"
                value={raw}
                onChange={(e) => {
                  setRaw(e.target.value.replace(/[^\d.,]/g, ''))
                  setError('')
                }}
                aria-invalid={error ? true : undefined}
                className="btn btn-quiet min-w-0 flex-1 font-display outline-none"
              />
              <span className="text-[17px] font-semibold text-muted">kg</span>
            </div>
          </div>
          <div className="flex w-[150px] flex-col gap-1.5">
            <label htmlFor="kg-date" className="text-[15px] font-semibold">
              Date
            </label>
            <input id="kg-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="field h-16 px-3" />
          </div>
        </div>

        {error ? (
          <div role="alert" className="text-sm font-medium text-danger">
            {error}
          </div>
        ) : (
          delta !== undefined &&
          previous && (
            <div className="text-sm font-semibold text-primary">
              {delta > 0 ? '+ ' : delta < 0 ? '− ' : ''}
              {formatKg(Math.abs(delta))} kg depuis le {formatShort(previous.date)}
            </div>
          )
        )}

        <button type="submit" className="btn btn-main">
          Enregistrer
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              deleteWeight(editing.id)
              onClose()
            }}
            className="btn btn-danger"
          >
            Supprimer cette pesée
          </button>
        )}
      </form>
    </Sheet>
  )
}
