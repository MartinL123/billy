import { Link, useParams } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { ChevronRightIcon } from '../../components/Icons'
import { useData } from '../../firebase/store'
import { isTrainingEntry, notedMinutes, sessionTitle } from '../../lib/billyPage'
import { formatDayHeading } from '../../lib/dates'
import { feelingLabel } from '../../lib/moment'
import { useBack } from '../../lib/useBack'

/** Les séances d’un jour de « Sa semaine » (T-104), quand il y en a eu plusieurs : un toucher ouvre chacune. */
export default function DaySessions() {
  const { date = '' } = useParams()
  const { dog, entries } = useData()
  const back = useBack('/billy')
  const sessions = entries.filter((e) => e.date === date && isTrainingEntry(e)).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label={dog.unnamed ? 'Votre chien' : dog.name} onClick={back} />
      </header>
      <main className="flex flex-col gap-4 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <h1 className="title-screen">{/^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDayHeading(date) : 'Ses séances'}</h1>
        {sessions.length === 0 && <p className="text-muted">Aucune séance notée ce jour-là.</p>}
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {sessions.map((s) => {
            const minutes = notedMinutes(s.text)
            const note = s.text.split('\n').find((line) => line.trim() && !line.startsWith(sessionTitle(s)))
            return (
              <li key={s.id}>
                <Link to={`/souvenir/${s.id}`} state={{ retour: 'Sa journée' }} className="card tap flex min-h-11 items-center gap-3 rounded-[20px] p-4 text-text no-underline">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="title-card">{sessionTitle(s)}</span>
                    <span className="text-[0.8235rem] text-muted">{[feelingLabel(s.feeling), minutes ? `${minutes} min` : ''].filter(Boolean).join(' · ')}</span>
                    {note && <span className="line-clamp-2 text-[0.8824rem] text-[#3F4946]">{note}</span>}
                  </span>
                  <ChevronRightIcon size={18} className="shrink-0 text-muted" />
                </Link>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
