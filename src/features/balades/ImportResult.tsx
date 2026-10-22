import { Link, Navigate } from 'react-router-dom'
import { Stats } from '../../components/Stats'
import { formatDuration } from '../../lib/balade'
import { formatLong } from '../../lib/dates'
import { formatRouteDistance } from '../../lib/route'
import { RouteThumb } from '../trajets/RouteThumb'
import { takeImportResult } from './importRun'
import { useData } from '../../firebase/store'
import { ofDog } from '../../lib/dogName'
import { APP_NAME } from '../../appName'
import { useToday } from '../../lib/useToday'
import { bigWalkNotice, dayBudget, minutesOfDay, walksOfDay } from '../../lib/walkDay'
import { walkTimes } from '../../lib/walks'

/** « Balades ajoutées ! » (maquette V3-ImportResultat ; V6.1 : plus de brouillard ni de pourcentage). */
export default function ImportResult() {
  const { dog, entries, walks } = useData()
  const today = useToday()
  const result = takeImportResult()
  // Règle des 5 minutes par mois d’âge (T-019) : après une grosse balade aujourd’hui, la suite reste courte.
  // Le même calcul que l’accueil (R-038) : ce qui reste se répartit sur les sorties encore à venir.
  const budget = dayBudget({ birthDate: dog.birthDate, today, times: walkTimes(dog.walkTimes), done: walks.find((w) => w.date === today)?.done ?? {}, walks: walksOfDay(entries, today, walks.find((w) => w.date === today)?.noted), now: minutesOfDay(new Date()) })
  // Seulement si la prochaine sortie est vraiment raccourcie (R-049).
  const notice = bigWalkNotice(budget, Boolean(budget && result?.walks.some((w) => w.date === today && (w.durationMin ?? 0) > budget.perWalk)))
  if (!result) return <Navigate to="/territoire" replace />
  const nothing = result.walks.length === 0

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <main className="flex flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-1">
          <h1 className="title-screen">{nothing ? `Tout était déjà dans ${APP_NAME}` : 'Le brouillard s’est levé !'}</h1>
          <p className="text-[1rem] text-muted">{nothing ? 'Aucune nouvelle balade dans ces fichiers.' : `Elles sont sur la carte ${ofDog(dog)}.`}</p>
        </div>
        {!nothing && (
          <>
            {/* Des balades et des km, en Stats (V6 § 1) ; V6.1 § 1 : plus de pourcentage découvert. */}
            <Stats
              items={[
                { value: String(result.walks.length), label: `Balade${result.walks.length > 1 ? 's' : ''} ajoutée${result.walks.length > 1 ? 's' : ''}` },
                { value: formatRouteDistance(result.distanceM), label: 'Parcourus' },
              ]}
            />
            {notice && <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[1rem] leading-snug text-[#1D3F73]">{notice}</p>}
            <ul className="card m-0 flex list-none flex-col p-0">
              {result.walks.slice(0, 30).map((w, i) => (
                <li key={w.entryId} className={i ? 'border-t border-divider' : ''}>
                  <Link to={`/souvenir/${w.entryId}`} className="flex min-h-14 items-center gap-3 px-3 py-2.5 text-text no-underline">
                    <RouteThumb points={w.points} size={56} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="title-card">{w.name}</span>
                      <span className="text-[0.8824rem] text-muted">{formatLong(w.date)}</span>
                      <Stats items={[{ value: formatRouteDistance(w.distanceM), label: 'Distance' }, { value: w.durationMin ? formatDuration(w.durationMin) : '', label: 'Durée' }]} className="mt-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {result.walks.length > 30 && <p className="text-[0.8824rem] text-muted">Et les autres, dans ses balades.</p>}
          </>
        )}
        {result.line && <p className="text-[0.8824rem] text-muted">{result.line}</p>}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <Link to="/territoire" replace className="btn btn-main min-h-[56px] w-full">
            Voir la carte
          </Link>
        </div>
      </div>
    </div>
  )
}
