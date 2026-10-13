import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { ImportIcon, PhotoIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { Fab } from '../../components/TabBar'
import { useData } from '../../firebase/store'
import type { EntryPhoto } from '../../firebase/types'
import { formatMonthYear, monthKey } from '../../lib/dates'
import { allTags, sameTag } from '../../lib/tags'
import { useToday } from '../../lib/useToday'
import { setDraftPhotos } from './draft'
import { EntryCard } from './EntryCard'
import { PhotoViewer } from './PhotoViewer'

function EmptyJournal({ onPhotos }: { onPhotos: (files: File[]) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-10 text-center">
      <div className="flex size-40 items-center justify-center rounded-full bg-milestone-soft text-milestone">
        <PhotoIcon size={84} strokeWidth={1.5} />
      </div>
      <h2 className="mt-2 font-display text-2xl leading-tight font-bold">Le premier souvenir de Billy commence ici</h2>
      <p className="text-base leading-[1.45] text-muted">Importe des photos de ta photothèque ou écris une note sur sa journée.</p>
      <FilePicker
        accept="image/*"
        onFiles={onPhotos}
        className="mt-2 flex h-[54px] items-center justify-center gap-2 rounded-full bg-primary px-7 text-[17px] font-bold text-white"
      >
        <ImportIcon size={20} />
        Importer des photos
      </FilePicker>
      <Link to="/souvenir/nouveau" className="p-3 text-base font-semibold text-primary no-underline">
        Écrire une note
      </Link>
    </div>
  )
}

export default function Journal() {
  const { entries } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const [tag, setTag] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ photos: EntryPhoto[]; start: number } | null>(null)

  const importPhotos = (files: File[]) => {
    setDraftPhotos(files)
    navigate('/souvenir/nouveau')
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
    `h-11 shrink-0 rounded-full px-4 text-[15px] whitespace-nowrap ${
      active ? 'border-0 bg-primary font-semibold text-white' : 'border-[1.5px] border-solid border-border bg-surface font-medium text-text'
    }`

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Journal" className="px-5" />

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
              <button type="button" onClick={() => setTag(null)} className="h-11 border-0 bg-transparent px-3 text-base font-semibold text-primary">
                Voir tous les souvenirs
              </button>
            </div>
          )}

          <Fab label="Nouveau souvenir" onClick={() => navigate('/souvenir/nouveau')} />
        </>
      )}

      {viewer && <PhotoViewer photos={viewer.photos} start={viewer.start} onClose={() => setViewer(null)} />}
    </div>
  )
}
