import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { FilePicker } from '../../components/FilePicker'
import { FormScreen } from '../../components/Form'
import { PlusIcon } from '../../components/Icons'
import { ConfirmSheet } from '../../components/Sheet'
import { deleteEntry, newId, saveEntry } from '../../firebase/db'
import { deleteFile, saveImage } from '../../firebase/files'
import { useData } from '../../firebase/store'
import type { EntryPhoto } from '../../firebase/types'
import { isValidISO } from '../../lib/dates'
import { compressImage, PHOTO } from '../../lib/image'
import { allTags, cleanTag, sameTag } from '../../lib/tags'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { takeDraftPhotos } from './draft'
import { errorText } from '../../firebase/errors'
import { placePhoto, timesAlong, type PhotoClue } from '../../lib/balade'
import { readPhotoClue } from '../../lib/photoClue'
import { readRoute } from '../../lib/route'

const MAX_PHOTOS = 10

/** Photo déjà enregistrée, ou photo tout juste importée (compressée, pas encore envoyée). */
type Item =
  | { key: string; saved: EntryPhoto }
  | { key: string; full: Blob; thumb: Blob; previewUrl: string; clue: PhotoClue }

export default function EntryForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { entries } = useData()
  const today = useToday()
  const back = useBack('/balades')
  const navigate = useNavigate()
  const existing = id ? entries.find((e) => e.id === id) : undefined
  const route = readRoute(existing?.route)

  const [items, setItems] = useState<Item[]>(() => (existing?.photos ?? []).map((saved) => ({ key: saved.fileId, saved })))
  const [text, setText] = useState(existing?.text ?? '')
  const [tags, setTags] = useState<string[]>(existing?.tags ?? params.getAll('tag'))
  const [date, setDate] = useState(existing?.date ?? today)
  const [newTag, setNewTag] = useState<string | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const itemsRef = useRef(items)
  itemsRef.current = items

  const addFiles = async (files: File[]) => {
    setError('')
    const room = MAX_PHOTOS - itemsRef.current.length
    if (files.length > room) setError(`10 photos maximum par souvenir : ${Math.max(0, room)} sur ${files.length} ajoutée${room > 1 ? 's' : ''}.`)
    const accepted = files.slice(0, Math.max(0, room))
    for (const [i, file] of accepted.entries()) {
      setProgress(`Préparation des photos… ${i + 1} sur ${accepted.length}`)
      try {
        // Position et heure de la photo, lues avant la compression qui les efface.
        const clue = await readPhotoClue(file)
        const { full, thumb } = await compressImage(file, PHOTO)
        const item: Item = { key: crypto.randomUUID(), full, thumb, previewUrl: URL.createObjectURL(thumb), clue }
        setItems((current) => [...current, item])
      } catch (err) {
        setError(errorText(err, "Une photo n'a pas pu être importée."))
      }
    }
    setProgress('')
  }

  // Photos choisies depuis l'accueil ; aperçus libérés en quittant l'écran.
  useEffect(() => {
    const draft = takeDraftPhotos()
    if (draft.length) void addFiles(draft)
    return () => {
      for (const item of itemsRef.current) if ('previewUrl' in item) URL.revokeObjectURL(item.previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (id && !existing && !saving) {
    return (
      <FormScreen title="Souvenir" submitLabel="Retour au souvenir" onCancel={back} onSubmit={back}>
        <p className="text-muted">Ce souvenir n'existe plus.</p>
      </FormScreen>
    )
  }

  const remove = (item: Item) => {
    if ('previewUrl' in item) URL.revokeObjectURL(item.previewUrl)
    setItems((current) => current.filter((i) => i.key !== item.key))
  }

  const toggleTag = (tag: string) => setTags((current) => (current.some((t) => sameTag(t, tag)) ? current.filter((t) => !sameTag(t, tag)) : [...current, tag]))

  const commitNewTag = () => {
    const tag = cleanTag(newTag ?? '')
    if (tag && !tags.some((t) => sameTag(t, tag))) setTags((current) => [...current, tag])
    setNewTag(null)
  }

  const save = async () => {
    if (progress) return
    if (!text.trim() && items.length === 0) return setError('Ajoutez au moins une photo ou quelques mots.')
    if (!isValidISO(date)) return setError('Choisissez une date.')
    setSaving(true)
    try {
      const photos: EntryPhoto[] = []
      for (const item of items) {
        if ('saved' in item) photos.push(item.saved)
        else {
          // Une photo prise pendant la balade se place sur le tracé (GPS de la photo, ou son heure).
          const at = route ? placePhoto(item.clue, route.points, timesAlong(route.points, route.startTime, route.durationMin)) : undefined
          photos.push({ fileId: await saveImage(item.full), thumbFileId: await saveImage(item.thumb), ...(at ? { lat: at.lat, lng: at.lng } : {}) })
        }
      }
      const { id: _id, pending: _pending, ...kept } = existing ?? ({} as Partial<NonNullable<typeof existing>>)
      saveEntry(existing?.id ?? newId('entries'), {
        ...kept,
        date,
        text: text.trim(),
        tags,
        photos,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      })
      // Photos retirées d'une entrée existante : leurs fichiers ne servent plus.
      for (const old of existing?.photos ?? []) {
        if (!photos.some((p) => p.fileId === old.fileId)) {
          deleteFile(old.fileId)
          deleteFile(old.thumbFileId)
        }
      }
      back()
    } catch (err) {
      setSaving(false)
      setError(errorText(err, "L'enregistrement a échoué."))
    }
  }

  const choices = allTags([...entries.flatMap((e) => e.tags), ...tags])
  const chipClass = (active: boolean) =>
    `min-h-12 rounded-full border-2 px-3.5 text-[17px] ${
      active ? 'border-primary bg-primary font-bold text-white' : 'border-border bg-surface font-medium text-text'
    }`

  return (
    <>
      <FormScreen
        title={existing ? 'Modifier le souvenir' : 'Nouveau souvenir'}
        submitLabel={saving ? 'Enregistrement…' : 'Enregistrer'}
        busy={saving || Boolean(progress)}
        onCancel={back}
        onSubmit={() => void save()}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[17px] font-semibold">Photos</span>
            <span className="text-[13px] text-muted">
              {items.length} sur {MAX_PHOTOS}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, i) => (
              <div key={item.key} className="relative aspect-square overflow-hidden rounded-field bg-placeholder">
                {'saved' in item ? (
                  <FileImage fileId={item.saved.thumbFileId} alt={`Photo ${i + 1}`} className="size-full" eager />
                ) : (
                  <img src={item.previewUrl} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                )}
                <button
                  type="button"
                  aria-label={`Retirer la photo ${i + 1}`}
                  onClick={() => remove(item)}
                  className="absolute inset-x-0 bottom-0 flex min-h-12 items-center justify-center border-0 bg-[rgba(24,32,30,0.72)] text-[17px] font-bold text-white"
                >
                  Retirer
                </button>
              </div>
            ))}
            {items.length < MAX_PHOTOS && (
              <FilePicker
                accept="image/*"
                onFiles={(files) => void addFiles(files)}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-field border-2 border-dashed border-[#9AA39F] bg-surface text-[13px] font-semibold text-primary"
              >
                <PlusIcon size={24} />
                Ajouter
              </FilePicker>
            )}
          </div>
          {progress && (
            <div role="status" className="text-sm font-medium text-muted">
              {progress}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="texte" className="text-[17px] font-semibold">
            Ce qui s'est passé
          </label>
          <textarea id="texte" rows={4} value={text} onChange={(e) => setText(e.target.value)} className="field resize-none py-3.5 leading-[1.45]" />
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[17px] font-semibold">Tags</legend>
          <div className="flex flex-wrap gap-2">
            {choices.map((tag) => {
              const active = tags.some((t) => sameTag(t, tag))
              return (
                <button key={tag} type="button" aria-pressed={active} onClick={() => toggleTag(tag)} className={chipClass(active)}>
                  {tag}
                </button>
              )
            })}
            {newTag === null ? (
              <button
                type="button"
                onClick={() => setNewTag('')}
                className="min-h-12 rounded-full border-2 border-dashed border-[#9AA39F] bg-transparent px-3.5 text-[17px] font-semibold text-primary"
              >
                + Nouveau
              </button>
            ) : (
              <input
                autoFocus
                aria-label="Nouveau tag"
                placeholder="Nouveau tag"
                maxLength={24}
                enterKeyHint="done"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onBlur={commitNewTag}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitNewTag()
                  }
                }}
                className="h-11 w-40 rounded-full border-2 border-primary bg-surface px-3.5"
              />
            )}
          </div>
        </fieldset>

        <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-field border-2 border-border bg-surface px-4">
          <label htmlFor="dt" className="text-[17px] font-semibold">
            Date
          </label>
          <input
            id="dt"
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="btn btn-outline text-right"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-field bg-danger-soft px-3.5 py-3 text-sm leading-snug font-medium text-danger">
            {error}
          </div>
        )}

        {existing && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-danger">
            Supprimer ce souvenir
          </button>
        )}
      </FormScreen>

      {confirmDelete && existing && (
        <ConfirmSheet
          title="Supprimer ce souvenir ?"
          message={existing.photos.length ? 'Le texte et ses photos seront supprimés définitivement.' : 'Ce souvenir sera supprimé définitivement.'}
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setSaving(true)
            deleteEntry(existing)
            // Le détail n'existe plus : on revient à ses balades.
            navigate('/balades', { replace: true })
          }}
        />
      )}
    </>
  )
}
