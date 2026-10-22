import { documentId, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { SubScreen } from '../calendar/SubScreen'
import { appOpened, logEvent } from '../../firebase/journal'
import { userCol } from '../../firebase/paths'
import { addDays, formatLong } from '../../lib/dates'
import { indicators, type JournalDay } from '../../lib/journal'
import { useToday } from '../../lib/useToday'
import { isNative } from '../../native'

/** T-066 : une ouverture de l’app (au plus une par heure) et, après un rechargement R-042, sa trace. */
export function JournalOpen() {
  useEffect(() => {
    appOpened(isNative())
    try {
      const reason = sessionStorage.getItem('flair.rechargement')
      if (reason) {
        sessionStorage.removeItem('flair.rechargement')
        logEvent({ type: 'crash_reload', reason })
      }
    } catch {
      // Stockage indisponible : rien à noter.
    }
  }, [])
  return null
}

const pct = (value: number | undefined) => (value === undefined ? '—' : `${Math.round(value * 100)} %`)
const duration = (sec: number | undefined) => (sec === undefined ? '—' : `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')} s`)

/**
 * `#/mesure` (T-066), sans lien dans l’app : les 3 indicateurs sur 7, 30 et 90 jours, et les événements du jour.
 * Rien n’est montré à un visiteur (route fermée) ; rien n’est envoyé ailleurs.
 */
export default function Mesure() {
  const today = useToday()
  const [journal, setJournal] = useState<JournalDay[]>()
  useEffect(() => {
    getDocs(query(userCol('journal'), where(documentId(), '>=', addDays(today, -89))))
      .then((snap) => setJournal(snap.docs.map((d) => ({ date: d.id, events: (d.data().events ?? []) as JournalDay['events'] }))))
      .catch(() => setJournal([]))
  }, [today])

  const windows = [7, 30, 90].map((days) => indicators(journal ?? [], today, days))
  const todayEvents = journal?.find((d) => d.date === today)?.events ?? []
  type Window = (typeof windows)[number]
  const rows: [string, (w: Window) => string][] = [
    ['Balades démarrées sur l’iPhone', (w) => String(w.walks.started)],
    ['Balades gardées (toutes sources)', (w) => String(w.walks.saved)],
    ['Dont iPhone / Watch / fichier / notées', (w) => `${w.walks.bySource.gps} / ${w.walks.bySource.watch} / ${w.walks.bySource.gpx} / ${w.walks.bySource.sortie}`],
    ['Balades perdues', (w) => String(w.walks.lost)],
    ['Reprises après incident / erreurs', (w) => `${w.walks.recovered} / ${w.walks.errors}`],
    ['Soins faits à temps', (w) => `${pct(w.care.rate)} (${w.care.onTime} sur ${w.care.done})`],
    ['Jours entraînés', (w) => `${w.training.days} (${pct(w.training.rate)})`],
    ['Durée médiane d’une séance', (w) => duration(w.training.medianSec)],
    ['Rechargements après une coupure', (w) => String(w.crashes)],
  ]

  return (
    <SubScreen title="Mesure">
      <p className="text-[0.8824rem] text-[#3F4946]">Journal privé, sous votre compte. Rien n’est envoyé ailleurs.</p>
      {!journal ? (
        <p className="text-[0.9412rem]">Lecture…</p>
      ) : (
        <>
          <ul className="card m-0 flex list-none flex-col p-0">
            {rows.map(([label, value], k) => (
              <li key={label} className={`flex flex-col gap-1 px-4 py-2.5 ${k ? 'border-0 border-t border-solid border-divider' : ''}`}>
                <span className="text-[0.8824rem] font-semibold">{label}</span>
                <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-[0.8824rem] text-[#3F4946]">
                  {windows.map((w) => (
                    <span key={w.days}>
                      {w.days} j : <strong className="text-text">{value(w)}</strong>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <h2 className="mt-2 text-[1rem] font-bold">Aujourd’hui, {formatLong(today)}</h2>
          {todayEvents.length ? (
            /* R-084 : une ligne JSON passe à la ligne (n’importe où) ; la page ne défile jamais de côté. */
            <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0 font-mono text-[0.7647rem] [overflow-wrap:anywhere]">
              {todayEvents.map((e, i) => (
                <li key={i}>{JSON.stringify(e)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.8824rem] text-muted">Aucun événement aujourd’hui.</p>
          )}
        </>
      )}
    </SubScreen>
  )
}
