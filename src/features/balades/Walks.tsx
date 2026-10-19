import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isNative } from '../../native'
import { FileImage } from '../../components/FileImage'
import { ChevronLeftIcon, NoteIcon } from '../../components/Icons'
import { setEntryCommune } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { formatDuration } from '../../lib/balade'
import { formatMonthYear, formatShort } from '../../lib/dates'
import { formatRouteDistance } from '../../lib/route'
import { communeName } from '../../lib/street'
import { useBack } from '../../lib/useBack'
import { ofName } from '../../lib/gender'
import { useToday } from '../../lib/useToday'
import { communesOf, filterWalks, walkColors, walkItems, walksSummary, walkTags, type WalkFilter } from '../../lib/walkList'
import { RouteThumb } from '../trajets/RouteThumb'

const PAGE = 12

/** « Ses balades » (maquette V3-Balades) : toutes les balades, filtres, groupées par mois. */
export default function Walks() {
  const { entries, dog } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const back = useBack('/territoire')
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<WalkFilter>(() => (params.get('filtre') as WalkFilter | null) ?? 'toutes')
  const [all, setAll] = useState(false)
  const walks = useMemo(() => walkItems(entries), [entries])
  const shown = useMemo(() => filterWalks(walks, filter, today), [walks, filter, today])
  const communes = useMemo(() => communesOf(walks), [walks])
  // La même couleur que sur la carte.
  const colors = useMemo(() => walkColors(walks), [walks])

  // La commune de chaque balade, demandée une fois (géocodage inverse du départ) puis gardée avec elle.
  useEffect(() => {
    let live = true
    const missing = walks.filter((w) => !w.commune).slice(0, 20)
    void (async () => {
      for (const w of missing) {
        if (!live) return
        const name = await communeName(w.route.points[0]![0], w.route.points[0]![1])
        if (name && live) setEntryCommune(w.id, name)
      }
    })()
    return () => {
      live = false
    }
    // Une seule passe à l’ouverture de l’écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Les souvenirs sans trajet (une photo, une note) apparaissent aussi, à leur date (spec V4 § 4), hors filtres de balade.
  type Row = { kind: 'balade'; item: (typeof shown)[number] } | { kind: 'souvenir'; id: string; date: string; text: string; thumb?: string }
  const souvenirs: Row[] =
    filter === 'toutes' || filter === 'mois'
      ? entries
          .filter((e) => !e.route?.points?.length && (filter === 'toutes' || e.date.startsWith(today.slice(0, 7))))
          .map((e) => ({ kind: 'souvenir' as const, id: e.id, date: e.date, text: e.text.split('\n')[0] || 'Un souvenir', ...(e.photos[0] ? { thumb: e.photos[0].thumbFileId } : {}) }))
      : []
  const rows: Row[] = [...shown.map((item) => ({ kind: 'balade' as const, item })), ...souvenirs].sort((a, b) => (b.kind === 'balade' ? b.item.date : b.date).localeCompare(a.kind === 'balade' ? a.item.date : a.date))
  const visible = all ? rows : rows.slice(0, PAGE)
  const groups = visible.reduce<{ key: string; items: Row[] }[]>((acc, row) => {
    const w = { date: row.kind === 'balade' ? row.item.date : row.date }
    const key = w.date.slice(0, 7)
    const last = acc[acc.length - 1]
    if (last?.key === key) last.items.push(row)
    else acc.push({ key, items: [row] })
    return acc
  }, [])
  const filters: { id: WalkFilter; label: string }[] = [{ id: 'toutes', label: 'Tout' }, { id: 'mois', label: 'Ce mois' }, ...communes.map((c) => ({ id: `commune:${c}` as WalkFilter, label: c })), { id: 'peur', label: 'Avec une peur' }, { id: 'long', label: 'Plus de 3 km' }]

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          La carte
        </button>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] leading-tight font-extrabold">Ses balades</h1>
          {/* Sans balade, pas de « 0 balade · 0,0 km » au-dessus de l’état vide (R-036). */}
          {!(rows.length === 0 && filter === 'toutes') && <p className="text-[17px] text-muted">{walksSummary(shown)}</p>}
        </div>
        {rows.length === 0 && filter === 'toutes' ? (
          // Rien du tout : un vrai état vide, qui propose d’importer (audit R-010).
          <section className="card flex flex-col items-center gap-3 px-5 py-6 text-center">
            <svg width="120" height="90" viewBox="0 0 120 90" aria-hidden="true">
              <rect x="4" y="10" width="112" height="72" rx="16" fill="#E8EFE9" />
              <path d="M22 66 C40 40 58 70 76 44 S100 30 104 26" fill="none" stroke="#9A4413" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 9" />
              <circle cx="22" cy="66" r="7" fill="#1E5A50" stroke="#fff" strokeWidth="3" />
            </svg>
            <h2 className="font-display text-[22px] font-extrabold">Pas encore de balade</h2>
            <p className="text-[17px] leading-snug text-[#3F4946]">{isNative() ? 'Vos marches de l’Apple Watch arrivent ici toutes seules' : 'Importez vos balades Strava : elles arrivent ici'}, et le brouillard se lève sur la carte {ofName(dog.name)}.</p>
            <Link to="/importer" className={`btn ${isNative() ? 'btn-outline min-h-12' : 'btn-main min-h-[56px]'} self-stretch`}>
              {isNative() ? 'Importer un fichier GPX' : 'Importer mes balades'}
            </Link>
          </section>
        ) : (
          <>
            <div role="group" aria-label="Filtrer les balades" className="scroll-row -mx-5 flex gap-2 px-5">
              {filters.map((f) => (
                <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`min-h-11 shrink-0 rounded-full border-2 border-solid px-4 text-[15px] font-bold ${filter === f.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {groups.length === 0 && <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[17px] text-[#1D3F73]">Aucune balade pour ce filtre.</p>}
            {groups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <h2 className="text-sm font-bold tracking-[0.6px] text-muted uppercase">{formatMonthYear(`${group.key}-01`)}</h2>
                <ul className="card m-0 flex list-none flex-col p-0">
                  {group.items.map((row, i) =>
                    row.kind === 'souvenir' ? (
                      <li key={row.id} className={i ? 'border-t border-divider' : ''}>
                        <Link to={`/souvenir/${row.id}`} className="tap flex items-center gap-3 px-3 py-2.5 text-text no-underline">
                          {row.thumb ? (
                            <FileImage fileId={row.thumb} alt="" className="size-14 shrink-0 rounded-[14px]" />
                          ) : (
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-bg text-primary">
                              <NoteIcon size={24} />
                            </span>
                          )}
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-[17px] font-bold">{row.text}</span>
                            <span className="text-[15px] text-muted">{formatShort(row.date)} · un souvenir</span>
                          </span>
                        </Link>
                      </li>
                    ) : (
                      <li key={row.item.id} className={i ? 'border-t border-divider' : ''}>
                        <Link to={`/souvenir/${row.item.id}`} className="tap flex items-center gap-3 px-3 py-2.5 text-text no-underline">
                          <RouteThumb points={row.item.route.points} moments={row.item.route.moments} size={56} />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-1.5 w-5 shrink-0 rounded-full" style={{ background: colors.get(row.item.id) }} aria-hidden="true" />
                              <span className="truncate text-[17px] font-bold">{row.item.name}</span>
                            </span>
                            <span className="text-[15px] text-muted">{[formatShort(row.item.date), row.item.commune, formatRouteDistance(row.item.route.distanceM), row.item.route.durationMin ? formatDuration(row.item.route.durationMin) : ''].filter(Boolean).join(' · ')}</span>
                            <span className="flex flex-wrap gap-1.5">
                              {walkTags(row.item).map((t) => (
                                <span key={t} className="rounded-full bg-bg px-2 py-0.5 text-[13px] font-semibold text-[#3F4946]">
                                  {t}
                                </span>
                              ))}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ))}
            {!all && rows.length > PAGE && (
              <button type="button" onClick={() => setAll(true)} className="btn btn-outline">
                Voir les {rows.length - PAGE} plus anciens
              </button>
            )}
          </>
        )}
      </main>
      {/* Pas de « Voir cette balade sur la carte » quand la liste est vide. */}
      {shown.length > 0 && (
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button type="button" onClick={() => navigate(`/territoire?filtre=${encodeURIComponent(filter)}`)} className="btn btn-main min-h-[56px] w-full">
            Voir {shown.length > 1 ? `ces ${shown.length} balades` : 'cette balade'} sur la carte
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
