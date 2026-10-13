import { useState } from 'react'
import { TrashIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { deleteSession, newId, saveSession } from '../../firebase/db'
import type { TrainingSession, WithId } from '../../firebase/types'
import { formatRelative, type ISODate } from '../../lib/dates'
import { RESULTS, type Exercise, type SessionResult } from '../../lib/training'

const resultLabel = (result: SessionResult) => RESULTS.find((r) => r.value === result)?.label ?? ''

interface SessionSheetProps {
  exercise: Exercise
  today: ISODate
  /** Séances de cet exercice, de la plus récente à la plus ancienne. */
  history: WithId<TrainingSession>[]
  onClose: () => void
}

/** Noter une séance : la consigne, puis un tap sur le résultat. */
export function SessionSheet({ exercise, today, history, onClose }: SessionSheetProps) {
  const [note, setNote] = useState('')

  const save = (result: SessionResult) => {
    saveSession(newId('sessions'), {
      date: today,
      exerciseId: exercise.id,
      result,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Sheet label={`Séance : ${exercise.name}`} onClose={onClose}>
      <h2 className="mt-1 font-display text-2xl font-bold">{exercise.name}</h2>
      <p className="rounded-field bg-primary-soft px-3.5 py-3 text-[15px] leading-snug text-primary-dark">{exercise.tip}</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-note" className="text-[15px] font-semibold">
          Note <span className="font-normal text-muted">(option)</span>
        </label>
        <input id="session-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lieu, durée, ce qui a aidé…" className="field" enterKeyHint="done" />
      </div>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[15px] font-semibold">Comment ça s'est passé aujourd'hui ?</legend>
        <div className="grid grid-cols-3 gap-2">
          {RESULTS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => save(value)}
              className={`h-[54px] rounded-full text-[15px] font-bold ${
                value === 'reussi' ? 'border-0 bg-primary text-white' : 'border-[1.5px] border-primary bg-surface text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {history.length > 0 && (
        <div className="flex flex-col">
          <h3 className="pt-1 text-[15px] font-semibold">Dernières séances</h3>
          {history.slice(0, 5).map((session) => (
            <div key={session.id} className="flex min-h-11 items-center gap-2 border-t border-divider text-[15px] first:border-t-0">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{resultLabel(session.result)}</span>
                <span className="text-muted">
                  {' '}
                  · {formatRelative(session.date, today)}
                  {session.note ? ` · ${session.note}` : ''}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Supprimer la séance (${formatRelative(session.date, today)})`}
                onClick={() => deleteSession(session.id)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-muted"
              >
                <TrashIcon size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
