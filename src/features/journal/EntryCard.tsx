import { Link } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { Pending } from '../../components/Pending'
import type { Entry, WithId } from '../../firebase/types'
import { formatRelative, formatShort, formatWeekdayShort, diffDays, parseISO, type ISODate } from '../../lib/dates'

/** « Hier · 12 oct. », « Lun. 5 oct. » */
export function entryDateLabel(date: ISODate, today: ISODate): string {
  const diff = diffDays(date, today)
  const year = parseISO(today).y
  if (diff >= 0 && diff <= 1) {
    const relative = formatRelative(date, today)
    return `${relative.charAt(0).toUpperCase()}${relative.slice(1)} · ${formatShort(date, year)}`
  }
  return formatWeekdayShort(date, year)
}

interface EntryCardProps {
  entry: WithId<Entry>
  today: ISODate
  activeTag: string | null
  onOpenPhoto: (index: number) => void
}

export function EntryCard({ entry, today, activeTag, onOpenPhoto }: EntryCardProps) {
  const { photos } = entry
  const photoButton = 'block w-full border-0 bg-transparent p-0'

  return (
    <article className="card overflow-hidden">
      {photos.length === 1 && photos[0] && (
        <button type="button" aria-label="Voir la photo en plein écran" onClick={() => onOpenPhoto(0)} className={photoButton}>
          <FileImage fileId={photos[0].thumbFileId} alt="" className="h-[200px] w-full" />
        </button>
      )}
      {photos.length > 1 && (
        <div className="grid grid-cols-3 gap-0.5">
          {photos.slice(0, 3).map((photo, i) => {
            const more = i === 2 ? photos.length - 3 : 0
            return (
              <button
                key={photo.fileId}
                type="button"
                aria-label={more ? `Voir les ${photos.length} photos` : `Voir la photo ${i + 1} en plein écran`}
                onClick={() => onOpenPhoto(i)}
                className={`${photoButton} relative`}
              >
                <FileImage fileId={photo.thumbFileId} alt="" className="h-[118px] w-full" />
                {more > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-[rgba(24,32,30,0.5)] text-lg font-bold text-white">+{more}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] font-semibold text-muted">{entryDateLabel(entry.date, today)}</span>
          <Pending show={entry.pending} />
        </div>
        {entry.text && <p className="text-base leading-[1.45] whitespace-pre-wrap">{entry.text}</p>}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-xl px-2.5 py-1 text-[13px] font-semibold ${
                  activeTag === tag ? 'bg-primary-soft text-primary-dark' : 'bg-[#EEF0EE] text-[#3F4946]'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <Link to={`/souvenir/${entry.id}`} className="btn btn-outline mt-1 min-h-12 self-start px-4">
          Modifier
        </Link>
      </div>
    </article>
  )
}
