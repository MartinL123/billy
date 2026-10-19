import { Link, Navigate } from 'react-router-dom'
import { formatDuration } from '../../lib/balade'
import { formatLong } from '../../lib/dates'
import { formatRouteDistance } from '../../lib/route'
import { RouteThumb } from '../trajets/RouteThumb'
import { takeImportResult } from './importRun'
import { useData } from '../../firebase/store'
import { ofName } from '../../lib/gender'
import { APP_NAME } from '../../appName'
import { useToday } from '../../lib/useToday'
import { minutesLabel } from '../../lib/walkBudget'
import { dayBudget, minutesOfDay, walksOfDay } from '../../lib/walkDay'
import { walkTimes } from '../../lib/walks'

const percent = (share: number) => (share > 0 && share < 0.01 ? 'moins de 1' : String(Math.round(share * 100)))

/** « Le brouillard s’est levé ! » (maquette V3-ImportResultat). */
export default function ImportResult() {
  const { dog, entries, walks } = useData()
  const today = useToday()
  const result = takeImportResult()
  // Règle des 5 minutes par mois d’âge (T-019) : après une grosse balade aujourd’hui, la suite reste courte.
  // Le même calcul que l’accueil (R-038) : ce qui reste se répartit sur les sorties encore à venir.
  const budget = dayBudget({ birthDate: dog.birthDate, today, times: walkTimes(dog.walkTimes), done: walks.find((w) => w.date === today)?.done ?? {}, walks: walksOfDay(entries, today), now: minutesOfDay(new Date()) })
  const tooLong = budget?.longWalk && result?.walks.some((w) => w.date === today && (w.durationMin ?? 0) > budget.perWalk)
  if (!result) return <Navigate to="/territoire" replace />
  const nothing = result.walks.length === 0
  const gained = result.share ? Math.round((result.share.after - result.share.before) * 100) : 0

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <main className="flex flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[30px] leading-tight font-extrabold">{nothing ? `Tout était déjà dans ${APP_NAME}` : 'Le brouillard s’est levé !'}</h1>
          <p className="text-[17px] text-muted">{nothing ? 'Aucune nouvelle balade dans ces fichiers.' : `${dog.name} a un nouveau bout de territoire.`}</p>
        </div>
        {!nothing && (
          <>
            {result.share && gained >= 1 && <span className="self-start rounded-full bg-gold px-3 py-1.5 text-[15px] font-extrabold text-gold-dark">+ {gained} % découvert</span>}
            {/* Des km et un % de la commune, pas de « cases » (audit R-018). */}
            <div className={`grid gap-2 text-center ${result.share ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {[
                [String(result.walks.length), `balade${result.walks.length > 1 ? 's' : ''} ajoutée${result.walks.length > 1 ? 's' : ''}`],
                [formatRouteDistance(result.distanceM), 'parcourus'],
                ...(result.share ? [[`${percent(result.share.after)} %`, `${ofName(result.share.name)} découvert`]] : []),
              ].map(([value, label]) => (
                <div key={label} className="card flex flex-col items-center gap-0.5 px-2 py-3">
                  <span className="font-display text-[22px] font-extrabold">{value}</span>
                  <span className="text-[13px] leading-tight text-muted">{label}</span>
                </div>
              ))}
            </div>
            {tooLong && budget && (
              <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[17px] leading-snug text-[#1D3F73]">
                Grosse balade aujourd’hui ({minutesLabel(budget.longWalk!)}, au lieu de {budget.perWalk} à {budget.months} mois).{' '}
                {budget.next ? `La prochaine sortie : ${budget.next} min suffisent.` : 'Pour le reste du jour, juste des sorties de 5 min pour ses besoins.'}
              </p>
            )}
            <ul className="card m-0 flex list-none flex-col p-0">
              {result.walks.slice(0, 30).map((w, i) => (
                <li key={w.entryId} className={i ? 'border-t border-divider' : ''}>
                  <Link to={`/souvenir/${w.entryId}`} className="flex min-h-14 items-center gap-3 px-3 py-2.5 text-text no-underline">
                    <RouteThumb points={w.points} size={48} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[17px] font-bold">{w.name}</span>
                      <span className="text-[15px] text-muted">{[formatLong(w.date), formatRouteDistance(w.distanceM), w.durationMin ? formatDuration(w.durationMin) : ''].filter(Boolean).join(' · ')}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {result.walks.length > 30 && <p className="text-[15px] text-muted">Et {result.walks.length - 30} autres, dans ses balades.</p>}
          </>
        )}
        {result.line && <p className="text-[15px] text-muted">{result.line}</p>}
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
