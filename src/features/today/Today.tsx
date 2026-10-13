import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { outlineButton } from '../../components/Form'
import { PageHeader } from '../../components/PageHeader'
import { Fab } from '../../components/TabBar'
import { useData } from '../../firebase/store'
import { formatAge, milestoneMessage } from '../../lib/age'
import { upcoming } from '../../lib/events'
import { onThisDay } from '../../lib/memories'
import { useToday } from '../../lib/useToday'
import { TodayEventRow } from '../calendar/EventRows'
import { entryDateLabel } from '../journal/EntryCard'
import { Meals } from './Meals'
import { QuickAdd } from './QuickAdd'

export default function Today() {
  const { dog, events, entries } = useData()
  const today = useToday()
  const [adding, setAdding] = useState(false)

  const next = upcoming(events, today).slice(0, 3)
  const toComplete = events.filter((e) => !e.date && !e.done).length
  const celebration = milestoneMessage(dog.name, dog.birthDate, dog.adoptionDate, today)
  const lastEntry = entries[0]
  const lastPhoto = lastEntry?.photos[0]
  const memories = onThisDay(entries, today)

  const sectionLink = 'py-2.5 text-[15px] font-semibold text-primary no-underline'

  return (
    <div className="flex flex-col gap-6 px-5">
      <PageHeader title="Aujourd'hui" />

      <section aria-label={dog.name} className="card overflow-hidden rounded-3xl">
        <div className="flex items-center gap-4 p-4">
          {dog.photoThumbFileId ? (
            <FileImage fileId={dog.photoThumbFileId} alt={`Photo de ${dog.name}`} className="size-[88px] shrink-0 rounded-[20px]" eager />
          ) : (
            <Link
              to="/profil"
              className="flex size-[88px] shrink-0 items-center justify-center rounded-[20px] bg-placeholder p-2 text-center text-xs font-semibold text-primary no-underline"
            >
              Ajouter une photo
            </Link>
          )}
          <div className="flex flex-col gap-1">
            <div className="font-display text-[26px] font-bold">{dog.name}</div>
            <div className="text-base text-muted">{formatAge(dog.birthDate, today)}</div>
          </div>
        </div>
        {celebration && <div className="bg-primary-soft px-4 py-3 text-[15px] font-medium text-primary-dark">{celebration}</div>}
      </section>

      {dog.feeding && dog.feeding.meals.length > 0 && <Meals dogName={dog.name} feeding={dog.feeding} today={today} />}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[19px] font-bold">À venir</h2>
          <Link to="/calendrier" className={sectionLink}>
            Tout voir
          </Link>
        </div>
        {next.length > 0 ? (
          <div className="card overflow-hidden">
            {next.map((event, i) => (
              <TodayEventRow key={event.id} event={event} today={today} first={i === 0} />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col gap-3 p-4">
            <p className="text-[15px] text-muted">Rien de prévu pour l'instant.</p>
            <Link to="/evenement/nouveau" className={outlineButton}>
              Ajouter un événement
            </Link>
          </div>
        )}
        {toComplete > 0 && (
          <Link to="/calendrier" className="flex min-h-11 items-center rounded-field bg-info-soft px-4 py-2.5 text-[15px] font-semibold text-[#1D3F73] no-underline">
            {toComplete > 1 ? `${toComplete} dates à compléter` : '1 date à compléter'} dans le calendrier
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[19px] font-bold">Dernier souvenir</h2>
          <Link to="/journal" className={sectionLink}>
            Journal
          </Link>
        </div>
        {lastEntry ? (
          <Link to="/journal" className="card flex items-center gap-3.5 overflow-hidden p-3 text-text no-underline">
            {lastPhoto && <FileImage fileId={lastPhoto.thumbFileId} alt="" className="size-24 shrink-0 rounded-field" />}
            <div className="flex min-w-0 flex-col gap-1.5 py-1">
              {lastEntry.text && <div className="line-clamp-3 text-[15px] leading-[1.4]">{lastEntry.text}</div>}
              <div className="text-[13px] text-muted">{[entryDateLabel(lastEntry.date, today).split(' · ')[0], ...lastEntry.tags.slice(0, 2)].join(' · ')}</div>
            </div>
          </Link>
        ) : (
          <div className="card flex flex-col gap-3 p-4">
            <p className="text-[15px] text-muted">Le premier souvenir de {dog.name} commence ici.</p>
            <Link to="/souvenir/nouveau" className={outlineButton}>
              Écrire une note
            </Link>
          </div>
        )}
      </section>

      {memories.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">Ce jour-là</h2>
          {memories.map(({ label, entry }) => (
            <Link key={entry.id} to={`/souvenir/${entry.id}`} className="card flex items-center gap-3.5 overflow-hidden p-3 text-text no-underline">
              {entry.photos[0] && <FileImage fileId={entry.photos[0].thumbFileId} alt="" className="size-24 shrink-0 rounded-field" />}
              <div className="flex min-w-0 flex-col gap-1.5 py-1">
                <div className="text-[13px] font-semibold text-milestone-dark">{label}</div>
                {entry.text && <div className="line-clamp-3 text-[15px] leading-[1.4]">{entry.text}</div>}
              </div>
            </Link>
          ))}
        </section>
      )}

      <Fab label="Ajouter une photo, une note, un événement ou un document" onClick={() => setAdding(true)} />
      {adding && <QuickAdd onClose={() => setAdding(false)} />}
    </div>
  )
}
