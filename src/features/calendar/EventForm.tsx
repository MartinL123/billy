import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FormScreen, Optional, Segmented, TextField } from '../../components/Form'
import { CalendarIcon, PaperclipIcon } from '../../components/Icons'
import { ConfirmSheet } from '../../components/Sheet'
import { deleteEvent, newId, saveEvent, setEventDone } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { BillyEvent } from '../../firebase/types'
import { isValidISO } from '../../lib/dates'
import { EVENT_TYPE_ORDER, EVENT_TYPES, type EventType } from '../../lib/events'
import { buildIcs } from '../../lib/ics'
import type { Recurrence } from '../../lib/recurrence'
import { safeFileName, shareFiles } from '../../lib/share'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { isNative } from '../../native'
import { askNotificationPermission } from '../notifications/localNotifications'

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Jamais' },
  { value: 'monthly', label: 'Mois' },
  { value: 'quarterly', label: '3 mois' },
  { value: 'yearly', label: 'An' },
]

const SUGGESTED_FOR: Partial<Record<EventType, string>> = {
  vaccin: 'un vaccin',
  vermifuge: 'un vermifuge',
  antiparasitaire: 'un antiparasitaire',
}

export default function EventForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { events, documents } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const back = useBack('/sante')
  const existing = id ? events.find((e) => e.id === id) : undefined

  // Depuis un filtre vide de Santé, le formulaire arrive pré-réglé sur la catégorie.
  const asked = params.get('type') as EventType | null
  const [type, setType] = useState<EventType>(existing?.type ?? (asked && asked in EVENT_TYPES ? asked : 'veto'))
  // Un titre peut arriver tout prêt (« J’ai pris rendez-vous » sur l’accueil, R-037).
  const [title, setTitle] = useState(existing?.title ?? (params.get('titre') || EVENT_TYPES[type].title))
  const [date, setDate] = useState(existing?.date ?? params.get('date') ?? today)
  const [time, setTime] = useState(existing?.time ?? '')
  const [recurrence, setRecurrence] = useState<Recurrence>(existing?.recurrence ?? EVENT_TYPES[type].recurrence)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (id && !existing) {
    return (
      <FormScreen title="Événement" submitLabel="Retour au calendrier" onCancel={back} onSubmit={back}>
        <p className="text-muted">Cet événement n’existe plus.</p>
      </FormScreen>
    )
  }

  const chooseType = (next: EventType) => {
    // Le titre suit le type tant qu’il n’a pas été personnalisé.
    if (!title.trim() || title === EVENT_TYPES[type].title) setTitle(EVENT_TYPES[next].title)
    if (!existing) setRecurrence(EVENT_TYPES[next].recurrence)
    setType(next)
  }

  const build = (): BillyEvent | null => {
    const found: typeof errors = {}
    if (!title.trim()) found.title = 'Donnez un titre à cet événement.'
    if (!isValidISO(date)) found.date = 'Choisissez une date.'
    setErrors(found)
    if (found.title || found.date) return null
    return {
      title: title.trim(),
      type,
      date,
      time: time || undefined,
      recurrence,
      notes: notes.trim() || undefined,
      done: existing?.done ?? false,
      doneAt: existing?.doneAt,
      documentIds: existing?.documentIds,
      nextId: existing?.nextId,
    }
  }

  const save = () => {
    const event = build()
    if (!event) return
    saveEvent(existing?.id ?? newId('events'), event)
    // App iOS (T-042) : le premier soin ajouté est le bon moment pour demander les notifications (jamais au lancement).
    if (!existing && isNative()) askNotificationPermission().catch(() => undefined)
    back()
  }

  // Joindre un document enregistre d’abord l’événement, pour pouvoir les lier.
  const attach = () => {
    const event = build()
    if (!event) return
    const eventId = existing?.id ?? newId('events')
    saveEvent(eventId, event)
    navigate(`/document/nouveau?eventId=${eventId}`, { replace: true })
  }

  // Rappel sur l’iPhone : l’événement part dans l’app Calendrier via le menu de partage.
  const exportToCalendar = () => {
    if (!existing?.date) return
    const ics = buildIcs({ ...existing, date: existing.date })
    void shareFiles([new File([ics], `${safeFileName(existing.title)}.ics`, { type: 'text/calendar' })], existing.title)
  }

  const linked = existing ? documents.filter((d) => existing.documentIds?.includes(d.id) || d.eventId === existing.id) : []
  const suggested = EVENT_TYPES[type].recurrence !== 'none' && recurrence === EVENT_TYPES[type].recurrence ? SUGGESTED_FOR[type] : undefined

  return (
    <>
      <FormScreen title={existing ? "Modifier l’événement" : 'Nouvel événement'} submitLabel="Enregistrer" onCancel={back} onSubmit={save}>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[1rem] font-semibold">Type</legend>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPE_ORDER.map((value) => {
              const active = value === type
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseType(value)}
                  className={`flex min-h-12 items-center gap-1.5 rounded-full border-2 px-3.5 text-[1rem] ${
                    active ? 'border-primary bg-primary font-bold text-white' : 'border-border bg-surface font-medium text-text'
                  }`}
                >
                  <span className="size-2 rounded-full" style={{ background: active ? '#FFFFFF' : EVENT_TYPES[value].color }} />
                  {EVENT_TYPES[value].label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <TextField label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} enterKeyHint="done" />

        <div className="grid grid-cols-2 gap-3">
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} className="px-3" />
          <TextField
            label={
              <>
                Heure
                <Optional />
              </>
            }
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="px-3"
          />
        </div>

        <Segmented
          legend="Se répète"
          options={RECURRENCES}
          value={recurrence}
          onChange={setRecurrence}
          hint={
            recurrence !== 'none' && (
              <>
                {suggested && `Suggéré pour ${suggested}. `}
                Le suivant sera créé quand vous marquerez celui-ci comme fait.
              </>
            )
          }
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-[1rem] font-semibold">
            Note
            <Optional />
          </label>
          <textarea
            id="note"
            rows={3}
            placeholder="Produit, dose, remarque…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="field resize-none py-3.5"
          />
        </div>

        {linked.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[1rem] font-semibold">Documents joints</span>
            <div className="card px-4 py-1">
              {linked.map((document, i) => (
                <Link
                  key={document.id}
                  to={`/document/${document.id}`}
                  className={`flex min-h-12 items-center gap-3 text-base font-semibold text-text no-underline ${i ? 'border-t border-divider' : ''}`}
                >
                  <PaperclipIcon size={20} className="shrink-0 text-primary" />
                  <span className="truncate">{document.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={attach}
          className="flex h-[52px] items-center justify-center gap-2 rounded-field border-2 border-dashed border-line-strong bg-transparent text-[1rem] font-semibold text-primary"
        >
          <PaperclipIcon size={20} />
          Joindre un document
        </button>

        {existing && (
          <div className="flex flex-col gap-1 pt-2">
            {existing.date && (
              <button
                type="button"
                onClick={() => {
                  setEventDone(existing, !existing.done)
                  back()
                }}
                className="btn btn-outline"
              >
                {existing.done ? 'Remettre à faire' : 'Marquer comme fait'}
              </button>
            )}
            {existing.date && !existing.done && (
              <button type="button" onClick={exportToCalendar} className="btn btn-outline">
                <CalendarIcon size={20} />
                Ajouter au calendrier de l’iPhone
              </button>
            )}
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-danger">
              Supprimer l’événement
            </button>
          </div>
        )}
      </FormScreen>

      {confirmDelete && existing && (
        <ConfirmSheet
          title="Supprimer cet événement ?"
          message={`« ${existing.title} » sera retiré du calendrier. Les documents joints restent dans le profil.`}
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteEvent(existing, documents)
            back()
          }}
        />
      )}
    </>
  )
}
