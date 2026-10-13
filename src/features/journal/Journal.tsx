import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { ImportIcon, PhotoIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { Fab } from '../../components/TabBar'
import { useData } from '../../firebase/store'
import type { EntryPhoto } from '../../firebase/types'
import { formatMonthYear, monthKey } from '../../lib/dates'
import { byRecency, modernCard, exposureAsMoment, sessionAsMoment } from '../../lib/carnet'
import { allTags, sameTag } from '../../lib/tags'
import { useToday } from '../../lib/useToday'
import { setDraftPhotos } from './draft'
import { EntryCard, type Moment } from './EntryCard'
import { PhotoViewer } from './PhotoViewer'

function EmptyJournal({ onPhotos }: { onPhotos: (files: File[]) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-10 text-center">
      <div className="flex size-40 items-center justify-center rounded-full bg-milestone-soft text-milestone">
        <PhotoIcon size={84} strokeWidth={1.5} />
      </div>
      <h2 className="mt-2 font-display text-2xl leading-tight font-bold">Le Carnet commence ici</h2>
      <p className="text-[17px] leading-[1.45] text-muted">Racontez ce que vous vivez ensemble, avec ou sans photo.</p>
      <Link to="/raconter" className="btn btn-main mt-2 w-full">
        Raconter ce qu'on a fait
      </Link>
      <FilePicker accept="image/*" onFiles={onPhotos} className="btn btn-outline w-full">
        <ImportIcon size={20} />
        Ajouter des photos
      </FilePicker>
    </div>
  )
}

export default function Journal() {
  const { entries: written, sessions, exposures } = useData()
  // Le Carnet est la seule liste : moments racontés, et anciennes séances et situations en lecture seule.
  const legacy: Moment[] = [...sessions.map(sessionAsMoment), ...exposures.map(exposureAsMoment)].map((m) => ({ ...m, tags: [], photos: [], pending: false, readOnly: true }))
  const entries: Moment[] = [...written.map(modernCard), ...legacy].sort(byRecency)
  const today = useToday()
  const navigate = useNavigate()
  const [tag, setTag] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ photos: EntryPhoto[]; start: number } | null>(null)

  const importPhotos = (files: File[]) => {
    setDraftPhotos(files)
    navigate('/raconter')
  }

  // Seuls les tags réellement utilisés servent de filtre.
  const used = entries.flatMap((e) => e.tags)
  const tags = allTags(used).filter((t) => used.some((u) => sameTag(u, t)))
  const visible = tag ? entries.filter((e) => e.tags.some((t) => sameTag(t, tag))) : entries

  const groups: { key: string; items: typeof visible }[] = []
  for (const entry of visible) {
    const key = monthKey(entry.date)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(entry)
    else groups.push({ key, items: [entry] })
  }

  const chip = (active: boolean) =>
    `min-h-12 shrink-0 rounded-full px-4 text-[17px] whitespace-nowrap ${
      active ? 'border-0 bg-primary font-semibold text-white' : 'border-2 border-solid border-border bg-surface font-medium text-text'
    }`

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Carnet" className="px-5" />

      {entries.length === 0 ? (
        <EmptyJournal onPhotos={importPhotos} />
      ) : (
        <>
          {tags.length > 0 && (
            <div role="group" aria-label="Filtrer par tag" className="flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
              <button type="button" aria-pressed={tag === null} onClick={() => setTag(null)} className={chip(tag === null)}>
                Tous
              </button>
              {tags.map((t) => (
                <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)} className={chip(tag === t)}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-3.5 px-5">
              <h2 className="text-sm font-bold tracking-[0.6px] text-muted uppercase">{formatMonthYear(`${group.key}-01`)}</h2>
              {group.items.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  today={today}
                  activeTag={tag}
                  onOpenPhoto={(start) => setViewer({ photos: entry.photos, start })}
                />
              ))}
            </section>
          ))}

          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 pt-6 text-center">
              <p className="text-muted">Aucun souvenir avec le tag « {tag} ».</p>
              <button type="button" onClick={() => setTag(null)} className="btn btn-outline">
                Voir tous les souvenirs
              </button>
            </div>
          )}

          <Fab label="Raconter ce qu'on a fait" onClick={() => navigate('/raconter')} />
        </>
      )}

      {viewer && <PhotoViewer photos={viewer.photos} start={viewer.start} onClose={() => setViewer(null)} />}
    </div>
  )
}
