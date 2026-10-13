import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { FormScreen, Optional, Segmented, TextField } from '../../components/Form'
import { ChevronRightIcon, ImportIcon, InfoIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { newId, saveDocument } from '../../firebase/db'
import { saveImage, savePdf } from '../../firebase/files'
import { useData } from '../../firebase/store'
import type { DocumentCategory } from '../../firebase/types'
import { MAX_PDF_SIZE } from '../../lib/chunks'
import { diffDays, formatLong, isValidISO } from '../../lib/dates'
import { typeInfo } from '../../lib/events'
import { compressImage, DOCUMENT_PAGE, formatBytes } from '../../lib/image'
import { inspectPdf } from '../../lib/pdf'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { CATEGORIES, kindBadge } from './documents'

/** Fichier choisi, prêt à être enregistré. */
type Picked =
  | { kind: 'pdf'; name: string; bytes: Uint8Array; pageCount: number; thumb: Blob; previewUrl: string }
  | { kind: 'images'; name: string; pages: Blob[]; size: number; thumb: Blob; previewUrl: string }

const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
const baseName = (name: string) => name.replace(/\.[^.]+$/, '')

export default function DocumentForm() {
  const [params] = useSearchParams()
  const { events } = useData()
  const today = useToday()
  const back = useBack('/sante')

  const [picked, setPicked] = useState<Picked | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocumentCategory>(params.get('eventId') ? 'veto' : 'sante')
  const [date, setDate] = useState(today)
  const [eventId, setEventId] = useState(params.get('eventId') ?? '')
  const [picking, setPicking] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => () => void (picked && URL.revokeObjectURL(picked.previewUrl)), [picked])

  const linkedEvent = events.find((e) => e.id === eventId)

  const choose = async (files: File[]) => {
    setError('')
    const pdf = files.find(isPdf)
    try {
      if (pdf) {
        if (pdf.size > MAX_PDF_SIZE) {
          return setError(`Ce PDF fait ${formatBytes(pdf.size)} : la limite est de 8 Mo. Rescanne-le en qualité plus basse, ou importe-le en plusieurs parties.`)
        }
        setProgress('Lecture du PDF…')
        const bytes = new Uint8Array(await pdf.arrayBuffer())
        const { pageCount, thumb } = await inspectPdf(bytes)
        setPicked({ kind: 'pdf', name: pdf.name, bytes, pageCount, thumb, previewUrl: URL.createObjectURL(thumb) })
        if (!title.trim()) setTitle(baseName(pdf.name))
        if (files.length > 1) setError('Un seul PDF par document : seul le premier a été gardé.')
      } else {
        const pages: Blob[] = []
        let thumb: Blob | undefined
        for (const [i, file] of files.entries()) {
          setProgress(`Préparation des pages… ${i + 1} sur ${files.length}`)
          const compressed = await compressImage(file, DOCUMENT_PAGE)
          pages.push(compressed.full)
          thumb ??= compressed.thumb
        }
        if (!thumb) return
        setPicked({
          kind: 'images',
          name: pages.length > 1 ? `${pages.length} photos de pages` : (files[0]?.name ?? 'Photo'),
          pages,
          size: pages.reduce((sum, p) => sum + p.size, 0),
          thumb,
          previewUrl: URL.createObjectURL(thumb),
        })
      }
    } catch (err) {
      const fallback = pdf
        ? "Ce PDF n'a pas pu être lu. S'il est protégé par un mot de passe, retire-le avant de l'importer."
        : 'Import impossible.'
      setError(!pdf && err instanceof Error ? err.message : fallback)
    } finally {
      setProgress('')
    }
  }

  const save = async () => {
    if (progress) return
    if (!picked) return setError('Choisis un PDF ou des photos de pages.')
    if (!title.trim()) return setError('Donne un titre à ce document.')
    if (!isValidISO(date)) return setError('Choisis la date du document.')
    setSaving(true)
    try {
      const fileIds = picked.kind === 'pdf' ? [savePdf(picked.bytes)] : await Promise.all(picked.pages.map(saveImage))
      saveDocument(newId('documents'), {
        title: title.trim(),
        category,
        date,
        eventId: linkedEvent ? eventId : undefined,
        kind: picked.kind,
        fileIds,
        thumbFileId: await saveImage(picked.thumb),
        pageCount: picked.kind === 'pdf' ? picked.pageCount : picked.pages.length,
        size: picked.kind === 'pdf' ? picked.bytes.length : picked.size,
        createdAt: new Date().toISOString(),
      })
      back()
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : "L'enregistrement a échoué.")
    }
  }

  const badge = picked && kindBadge(picked.kind)
  const pageCount = picked ? (picked.kind === 'pdf' ? picked.pageCount : picked.pages.length) : 0
  // Les événements les plus proches de la date du document d'abord.
  const distance = (eventDate: string) => Math.abs(diffDays(isValidISO(date) ? date : today, eventDate))
  const pickerEvents = events.filter((e) => e.date).sort((a, b) => distance(a.date) - distance(b.date))

  return (
    <>
      <FormScreen
        title="Nouveau document"
        submitLabel={saving ? 'Enregistrement…' : 'Enregistrer le document'}
        busy={saving || Boolean(progress)}
        onCancel={back}
        onSubmit={() => void save()}
      >
        {picked && badge ? (
          <div className="card flex items-center gap-3.5 p-3.5">
            <div className={`relative flex h-[84px] w-16 shrink-0 items-end justify-center overflow-hidden rounded-lg border ${badge.className}`}>
              <img src={picked.previewUrl} alt="" className="absolute inset-0 size-full object-cover" />
              <span className={`relative w-full py-0.5 text-center text-[11px] font-bold ${badge.className}`}>{badge.label}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="truncate text-base font-semibold">{picked.name}</div>
              <div className="text-sm text-muted">
                {pageCount} page{pageCount > 1 ? 's' : ''} · {formatBytes(picked.kind === 'pdf' ? picked.bytes.length : picked.size)}
              </div>
              <FilePicker accept="application/pdf,image/*" onFiles={(files) => void choose(files)} className="flex h-11 items-center self-start text-[15px] font-semibold text-primary">
                Changer de fichier
              </FilePicker>
            </div>
          </div>
        ) : (
          <FilePicker
            accept="application/pdf,image/*"
            onFiles={(files) => void choose(files)}
            className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-[#9AA39F] bg-surface p-4 text-center text-primary"
          >
            <ImportIcon size={28} />
            <span className="text-[17px] font-bold">Choisir un fichier</span>
            <span className="text-sm text-muted">Un PDF depuis Fichiers, ou une ou plusieurs photos de pages</span>
          </FilePicker>
        )}

        {progress && (
          <div role="status" className="text-sm font-medium text-muted">
            {progress}
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-field bg-info-soft px-3.5 py-3">
          <InfoIcon size={20} className="mt-px shrink-0 text-info" />
          <p className="text-sm leading-[1.4] text-[#1D3F73]">Pour scanner un papier, utilise l'app Notes ou Fichiers de ton iPhone, puis importe le PDF ici.</p>
        </div>

        <TextField label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Carnet de santé, compte rendu…" enterKeyHint="done" />

        <Segmented legend="Catégorie" options={CATEGORIES.map((c) => ({ value: c.value, label: c.short }))} value={category} onChange={setCategory} />

        <TextField label="Date du document" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="px-3" />

        <div className="flex flex-col gap-1.5">
          <span id="lien-label" className="text-[15px] font-semibold">
            Lier à un événement
            <Optional />
          </span>
          <button
            type="button"
            aria-describedby="lien-label"
            onClick={() => setPicking(true)}
            className="flex min-h-14 items-center gap-3 rounded-field border-[1.5px] border-border bg-surface px-4 text-left"
          >
            {linkedEvent ? (
              <>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: typeInfo(linkedEvent.type).color }} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-semibold text-text">{linkedEvent.title}</span>
                  <span className="text-[13px] text-muted">{formatLong(linkedEvent.date)}</span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-base text-muted">Aucun</span>
            )}
            <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-field bg-danger-soft px-3.5 py-3 text-sm leading-snug font-medium text-danger">
            {error}
          </div>
        )}
      </FormScreen>

      {picking && (
        <Sheet label="Lier à un événement" onClose={() => setPicking(false)}>
          <h2 className="my-1 font-display text-2xl font-bold">Lier à un événement</h2>
          <div className="flex flex-col">
            {[undefined, ...pickerEvents].map((event) => {
              const active = (event?.id ?? '') === (linkedEvent?.id ?? '')
              return (
                <button
                  key={event?.id ?? 'aucun'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setEventId(event?.id ?? '')
                    setPicking(false)
                  }}
                  className={`flex min-h-14 items-center gap-3 rounded-field border-0 px-3 text-left ${active ? 'bg-primary-soft' : 'bg-transparent'}`}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: event ? typeInfo(event.type).color : 'transparent' }} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-semibold text-text">{event?.title ?? 'Aucun événement'}</span>
                    {event && <span className="text-[13px] text-muted">{formatLong(event.date)}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </Sheet>
      )}
    </>
  )
}
