import { lazy, Suspense, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { formatDuration } from '../../lib/balade'
import { formatLong } from '../../lib/dates'
import { formatRouteDistance, type Route } from '../../lib/route'
import { takeImportResult } from './importRun'

const WalksMap = lazy(() => import('../trajets/WalksMap').then((m) => ({ default: m.WalksMap })))

const percent = (share: number) => (share > 0 && share < 0.01 ? 'moins de 1' : String(Math.round(share * 100)))

/** « Le brouillard s'est levé ! » (maquette V3-ImportResultat). */
export default function ImportResult() {
  const result = takeImportResult()
  const routes = useMemo<Route[]>(() => (result?.walks ?? []).map((w) => ({ points: w.points, distanceM: w.distanceM, moments: [] })), [result])
  if (!result) return <Navigate to="/territoire" replace />
  const nothing = result.walks.length === 0
  const gained = result.share ? Math.round((result.share.after - result.share.before) * 100) : 0

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <main className="flex flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[30px] leading-tight font-extrabold">{nothing ? 'Tout était déjà dans Billy' : 'Le brouillard s’est levé !'}</h1>
          <p className="text-[17px] text-muted">{nothing ? 'Aucune nouvelle balade dans ces fichiers.' : 'Billy a un nouveau bout de territoire.'}</p>
        </div>
        {!nothing && (
          <>
            <div className="relative h-[220px] overflow-hidden rounded-[20px] bg-placeholder">
              <Suspense fallback={null}>
                <WalksMap routes={routes} />
              </Suspense>
              {result.share && (
                <span className="absolute top-3 left-3 rounded-full bg-gold px-3 py-1.5 text-[15px] font-extrabold text-gold-dark shadow-[0_2px_8px_rgba(24,32,30,0.2)]">
                  {gained >= 1 ? `+ ${gained} % découvert` : `${percent(result.share.after)} % de ${result.share.name}`}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [String(result.walks.length), `balade${result.walks.length > 1 ? 's' : ''} ajoutée${result.walks.length > 1 ? 's' : ''}`],
                [formatRouteDistance(result.distanceM), 'parcourus'],
                [result.newCells.toLocaleString('fr-FR'), `case${result.newCells > 1 ? 's' : ''} découverte${result.newCells > 1 ? 's' : ''}`],
              ].map(([value, label]) => (
                <div key={label} className="card flex flex-col items-center gap-0.5 px-2 py-3">
                  <span className="font-display text-[22px] font-extrabold">{value}</span>
                  <span className="text-[13px] leading-tight text-muted">{label}</span>
                </div>
              ))}
            </div>
            <ul className="card m-0 flex list-none flex-col p-0">
              {result.walks.slice(0, 30).map((w, i) => (
                <li key={w.entryId} className={i ? 'border-t border-divider' : ''}>
                  <Link to={`/souvenir/${w.entryId}`} className="flex min-h-14 flex-col justify-center px-4 py-2.5 text-text no-underline">
                    <span className="text-[17px] font-bold">{w.name}</span>
                    <span className="text-[15px] text-muted">{[formatLong(w.date), formatRouteDistance(w.distanceM), w.durationMin ? formatDuration(w.durationMin) : '', 'ajoutée au Carnet'].filter(Boolean).join(' · ')}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {result.walks.length > 30 && <p className="text-[15px] text-muted">Et {result.walks.length - 30} autres, dans le Carnet.</p>}
          </>
        )}
        <p className="text-[15px] text-muted">{result.line}</p>
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
