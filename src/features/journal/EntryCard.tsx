import { Link } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { ChevronRightIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { territoryOf } from '../../content/phrases'
import { bossById } from '../../content/training'
import type { Entry, WithId } from '../../firebase/types'
import { formatRelative, formatShort, formatWeekdayShort, diffDays, parseISO, type ISODate } from '../../lib/dates'
import { feelingLabel } from '../../lib/moment'
import { Face } from './Face'

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

/** Un moment du Carnet. `readOnly` : ancienne séance ou situation, affichée en résumé. */
export type Moment = WithId<Entry> & { readOnly?: boolean }

interface EntryCardProps {
  entry: Moment
  today: ISODate
  activeTag: string | null
  onOpenPhoto: (index: number) => void
}

const chip = 'flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-sm font-semibold'

/** Le visage du ressenti et les compétences travaillées, à la couleur de leur territoire. */
export function MomentChips({ entry, activeTag }: { entry: Moment; activeTag?: string | null }) {
  const feeling = feelingLabel(entry.feeling)
  if (!feeling && !entry.fear && !entry.skills?.length && entry.tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {feeling && entry.feeling && (
        <span className={`${chip} bg-gold-soft text-[#5C4508]`}>
          <Face feeling={entry.feeling} size={20} />
          {feeling}
        </span>
      )}
      {entry.fear && entry.movedAway && <span className={`${chip} bg-info-soft text-[#1D3F73]`}>On s’est éloignés</span>}
      {entry.skills?.map((id) => {
        const territory = territoryOf(id)
        return (
          <span key={id} className={chip} style={{ background: territory.soft, color: territory.color }}>
            {bossById(id)?.name}
          </span>
        )
      })}
      {entry.tags.map((tag) => (
        <span key={tag} className={`${chip} ${activeTag === tag ? 'bg-primary text-white' : 'bg-[#EEF0EE] text-[#3F4946]'}`}>
          {tag}
        </span>
      ))}
    </div>
  )
}

/** Une carte du Carnet : toute la partie texte est un bouton (chevron) qui ouvre le détail, où se trouve « Modifier ». */
export function EntryCard({ entry, today, activeTag, onOpenPhoto }: EntryCardProps) {
  // Une carte sans photo n'a pas de zone photo ; une photo sans fichier non plus.
  const photos = entry.photos.filter((p) => p.thumbFileId)
  const photoButton = 'block w-full border-0 bg-transparent p-0'
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-muted">{entryDateLabel(entry.date, today)}</span>
          <Pending show={entry.pending} />
        </span>
        {entry.text && <span className="text-[17px] leading-[1.45] whitespace-pre-wrap">{entry.text}</span>}
        <MomentChips entry={entry} activeTag={activeTag} />
      </span>
      {!entry.readOnly && <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />}
    </>
  )

  return (
    <article className="card overflow-hidden">
      {photos.length === 1 && photos[0] && (
        <button type="button" aria-label="Voir la photo en plein écran" onClick={() => onOpenPhoto(0)} className={photoButton}>
          <FileImage fileId={photos[0].thumbFileId} alt="" className="h-[200px] w-full" hideMissing />
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
                <FileImage fileId={photo.thumbFileId} alt="" className="h-[118px] w-full" hideMissing />
                {more > 0 && <span className="absolute inset-0 flex items-center justify-center bg-[rgba(24,32,30,0.5)] text-lg font-bold text-white">+{more}</span>}
              </button>
            )
          })}
        </div>
      )}
      {entry.readOnly ? (
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-4">{body}</div>
      ) : (
        <Link to={`/souvenir/${entry.id}`} aria-label={`Ouvrir : ${entry.text.slice(0, 60) || 'photos'}`} className="flex min-h-16 items-center gap-3 px-4 pt-3.5 pb-4 text-text no-underline">
          {body}
        </Link>
      )}
    </article>
  )
}
