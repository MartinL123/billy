import { useState } from 'react'
import { TrashIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { deleteExposure, newId, saveExposure } from '../../firebase/db'
import type { Exposure, WithId } from '../../firebase/types'
import { formatShort, isValidISO, type ISODate } from '../../lib/dates'
import { allTriggers, FEAR_LEVELS, fearLabel } from '../../lib/training'

interface ExposureSheetProps {
  today: ISODate
  exposures: WithId<Exposure>[]
  /** Déclencheur pré-sélectionné (ouvre aussi son historique). */
  trigger?: string
  onClose: () => void
}

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr')

/** Noter une exposition : ce qui lui a fait peur, à quel point, à quelle distance. */
export function ExposureSheet({ today, exposures, trigger: initial, onClose }: ExposureSheetProps) {
  const [trigger, setTrigger] = useState(initial ?? '')
  const [custom, setCustom] = useState<string | null>(null)
  const [fear, setFear] = useState<number | null>(null)
  const [distance, setDistance] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState('')

  const triggers = allTriggers([...exposures.map((e) => e.trigger), trigger])
  const history = trigger ? exposures.filter((e) => same(e.trigger, trigger)) : []

  const commitCustom = () => {
    const value = (custom ?? '').trim().replace(/\s+/g, ' ')
    if (value) setTrigger(value.charAt(0).toUpperCase() + value.slice(1))
    setCustom(null)
  }

  const save = () => {
    const meters = Number(distance.trim().replace(',', '.'))
    if (!trigger.trim()) return setError('Choisis ce qui lui a fait peur.')
    if (fear === null) return setError('Indique son niveau de peur, de 1 à 5.')
    if (distance.trim() && !(Number.isFinite(meters) && meters >= 0 && meters < 1000)) return setError('La distance est en mètres, par exemple 10.')
    if (!isValidISO(date)) return setError('Choisis une date.')
    saveExposure(newId('exposures'), {
      date,
      trigger: trigger.trim(),
      fear,
      distance: distance.trim() ? meters : undefined,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    })
    onClose()
  }

  const chip = (active: boolean) =>
    `h-11 rounded-full border-[1.5px] px-3.5 text-[15px] ${active ? 'border-primary bg-primary-soft font-bold text-primary-dark' : 'border-border bg-surface font-medium text-text'}`

  return (
    <Sheet label="Noter une exposition" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <h2 className="mt-1 font-display text-2xl font-bold">Noter une exposition</h2>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[15px] font-semibold">Qu'est-ce qui lui a fait peur ?</legend>
          <div className="flex flex-wrap gap-2">
            {triggers.map((t) => (
              <button key={t} type="button" aria-pressed={same(t, trigger)} onClick={() => setTrigger(t)} className={chip(same(t, trigger))}>
                {t}
              </button>
            ))}
            {custom === null ? (
              <button type="button" onClick={() => setCustom('')} className="h-11 rounded-full border-[1.5px] border-dashed border-[#9AA39F] bg-transparent px-3.5 text-[15px] font-semibold text-primary">
                + Autre
              </button>
            ) : (
              <input
                autoFocus
                aria-label="Autre déclencheur"
                placeholder="Le skate, l'aspirateur…"
                maxLength={40}
                enterKeyHint="done"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onBlur={commitCustom}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitCustom()
                  }
                }}
                className="h-11 w-52 rounded-full border-[1.5px] border-primary bg-surface px-3.5"
              />
            )}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[15px] font-semibold">Niveau de peur</legend>
          <div className="grid grid-cols-5 gap-1 rounded-field bg-placeholder p-1">
            {FEAR_LEVELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={fear === value}
                aria-label={`${value} sur 5 : ${label}`}
                onClick={() => {
                  setFear(value)
                  setError('')
                }}
                className={`h-11 rounded-[10px] border-0 text-base ${fear === value ? 'bg-surface font-bold text-text shadow-[0_1px_3px_rgba(24,32,30,0.12)]' : 'bg-transparent font-medium text-[#3F4946]'}`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[13px] text-muted">
            <span>{fear ? `${fear} : ${fearLabel(fear)}` : '1 : serein'}</span>
            {!fear && <span>5 : panique</span>}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="distance" className="text-[15px] font-semibold">
              Distance <span className="font-normal text-muted">(m, option)</span>
            </label>
            <input id="distance" inputMode="decimal" autoComplete="off" placeholder="10" value={distance} onChange={(e) => setDistance(e.target.value.replace(/[^\d.,]/g, ''))} className="field" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="expo-date" className="text-[15px] font-semibold">
              Date
            </label>
            <input id="expo-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="field px-3" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expo-note" className="text-[15px] font-semibold">
            Note <span className="font-normal text-muted">(option)</span>
          </label>
          <input id="expo-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce qui a aidé, sa réaction…" className="field" enterKeyHint="done" />
        </div>

        {error && (
          <div role="alert" className="text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <button type="submit" className="h-[54px] rounded-full border-0 bg-primary text-[17px] font-bold text-white">
          Enregistrer
        </button>

        {history.length > 0 && (
          <div className="flex flex-col">
            <h3 className="text-[15px] font-semibold">Historique : {trigger}</h3>
            {history.slice(0, 8).map((exposure) => (
              <div key={exposure.id} className="flex min-h-11 items-center gap-2 border-t border-divider text-[15px] first:border-t-0">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">
                    {exposure.fear}/5 · {fearLabel(exposure.fear)}
                  </span>
                  <span className="text-muted">
                    {' '}
                    · {formatShort(exposure.date)}
                    {exposure.distance !== undefined ? ` · à ${String(exposure.distance).replace('.', ',')} m` : ''}
                    {exposure.note ? ` · ${exposure.note}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Supprimer l'exposition du ${formatShort(exposure.date)}`}
                  onClick={() => deleteExposure(exposure.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-muted"
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </form>
    </Sheet>
  )
}
