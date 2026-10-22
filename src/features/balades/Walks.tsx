import { useEffect, useMemo, useState } from 'react'
import { Stats } from '../../components/Stats'
import { BackLink } from '../../components/BackLink'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isNative } from '../../native'
import { FileImage } from '../../components/FileImage'
import { NoteIcon, PlusIcon } from '../../components/Icons'
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
import { useReadOnly } from '../../firebase/viewer'
import { bilanStats, monthReport, monthStats, topMomentLine, walkPhotos } from '../../lib/walkBilan'
import { PhotoViewer } from '../journal/PhotoViewer'

const PAGE = 12
/** Les photos de balade montrées d’abord (miniatures) ; « Voir les N photos » pour le reste. */
const PHOTOS = 9

/**
 * « Ses balades » (maquette V3-Balades) : toutes les balades, filtres, groupées par mois. En haut, le bilan (V6 § 8.5) :
 * les Stats de toujours, le bilan du mois et toutes les photos de balade. Seulement ce qui monte, sans comparaison.
 */
export default function Walks() {
  const readOnly = useReadOnly()
  const { entries, dog } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const back = useBack('/territoire')
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<WalkFilter>(() => (params.get('filtre') as WalkFilter | null) ?? 'toutes')
  // T-098 : le filtre dans l’adresse (sans nouvelle entrée d’historique) : le retour de la fiche d’une balade le retrouve.
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (filter === 'toutes') next.delete('filtre')
    else next.set('filtre', filter)
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])
  const [all, setAll] = useState(false)
  const walks = useMemo(() => walkItems(entries), [entries])
  const shown = useMemo(() => filterWalks(walks, filter, today), [walks, filter, today])
  const communes = useMemo(() => communesOf(walks), [walks])
  // La même couleur que sur la carte.
  const colors = useMemo(() => walkColors(walks), [walks])
  // Le bilan : les totaux, le mois, les photos (V6.1 § 1 : plus de part découverte).
  const month = useMemo(() => monthReport(walks, today.slice(0, 7)), [walks, today])
  const photos = useMemo(() => walkPhotos(entries), [entries])
  const [allPhotos, setAllPhotos] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null)
  const momentLine = topMomentLine(month.topMoment)

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
      <header className="flex items-center bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label="La carte" onClick={back} />
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-1">
          <h1 className="title-screen">Ses balades</h1>
          {/* Sans balade, pas de « 0 balade · 0,0 km » au-dessus de l’état vide (R-036). */}
          {walks.length > 0 && <Stats items={bilanStats(walks)} className="mt-2" />}
        </div>
        {/* « Noter un souvenir » vit ici depuis la V5 (il a quitté l’accueil). */}
        {!readOnly && (
          <Link to="/noter" className="tap btn btn-tertiary min-h-12 gap-2">
            <PlusIcon size={20} />
            Noter un souvenir
          </Link>
        )}
        {/* Le bilan du mois : le récap du dimanche en plus grand. */}
        {month.walks > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">
              Ce mois-ci <span className="sr-only">({formatMonthYear(`${today.slice(0, 7)}-01`)})</span>
            </h2>
            <div className="card flex flex-col gap-3 p-4">
              <Stats items={monthStats(month)} />
              {momentLine && <p className="m-0 text-[0.9412rem] leading-snug">{momentLine}</p>}
            </div>
          </section>
        )}
        {/* Toutes les photos de balade : les miniatures ; la photo entière à l’ouverture. */}
        {photos.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">Photos de balade</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {(allPhotos ? photos : photos.slice(0, PHOTOS)).map((photo, i) => (
                <button key={photo.fileId} type="button" aria-label={`Voir la photo ${i + 1} sur ${photos.length} en plein écran`} onClick={() => setViewer(i)} className="tap block overflow-hidden rounded-field border-0 bg-transparent p-0">
                  <FileImage fileId={photo.thumbFileId} alt="" className="aspect-square w-full" />
                </button>
              ))}
            </div>
            {!allPhotos && photos.length > PHOTOS && (
              <button type="button" onClick={() => setAllPhotos(true)} className="btn-text -ml-1 self-start">
                Voir les {photos.length} photos
              </button>
            )}
          </section>
        )}
        {rows.length === 0 && filter === 'toutes' ? (
          // Rien du tout : un vrai état vide, qui propose d’importer (audit R-010).
          <section className="card flex flex-col items-center gap-3 px-5 py-6 text-center">
            <svg width="120" height="90" viewBox="0 0 120 90" aria-hidden="true">
              <rect x="4" y="10" width="112" height="72" rx="16" fill="#E8EFE9" />
              <path d="M22 66 C40 40 58 70 76 44 S100 30 104 26" fill="none" stroke="var(--color-route)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 9" />
              <circle cx="22" cy="66" r="7" fill="#1E5A50" stroke="#fff" strokeWidth="3" />
            </svg>
            <h2 className="title-section">Pas encore de balade</h2>
            <p className="text-[1rem] leading-snug text-[#3F4946]">{isNative() ? 'Vos marches de l’Apple Watch arrivent ici toutes seules' : 'Importez vos balades Strava : elles arrivent ici'}, et s’affichent sur la carte {ofName(dog.name)}.</p>
            {!readOnly && (
              <Link to="/importer" className={`btn ${isNative() ? 'btn-tertiary min-h-12' : 'btn-main min-h-[56px]'} self-stretch`}>
                {isNative() ? 'Importer un fichier GPX' : 'Importer mes balades'}
              </Link>
            )}
          </section>
        ) : (
          <>
            <div role="group" aria-label="Filtrer les balades" className="scroll-row -mx-5 flex gap-2 px-5">
              {filters.map((f) => (
                <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`chip px-4 ${filter === f.id ? 'chip-on' : ''}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* Un filtre : ses balades à lui, en chiffres. */}
            {filter !== 'toutes' && shown.length > 0 && <Stats items={walksSummary(shown)} />}
            {groups.length === 0 && <p className="rounded-field bg-info-soft px-4 py-3 text-[1rem] text-[#1D3F73]">Aucune balade pour ce filtre.</p>}
            {groups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <h2 className="text-muted surtitre">{formatMonthYear(`${group.key}-01`)}</h2>
                <ul className="card m-0 flex list-none flex-col p-0">
                  {group.items.map((row, i) =>
                    row.kind === 'souvenir' ? (
                      <li key={row.id} className={i ? 'border-t border-divider' : ''}>
                        <Link to={`/souvenir/${row.id}`} className="tap flex items-center gap-3 px-3 py-2.5 text-text no-underline">
                          {row.thumb ? (
                            <FileImage fileId={row.thumb} alt="" className="size-14 shrink-0 rounded-field" />
                          ) : (
                            // V6 § 1 : une icône calme, sans carré de couleur.
                            <span className="flex size-14 shrink-0 items-center justify-center text-primary">
                              <NoteIcon size={28} />
                            </span>
                          )}
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="title-card truncate">{row.text}</span>
                            <span className="text-[0.8824rem] text-muted">{formatShort(row.date)} · un souvenir</span>
                          </span>
                        </Link>
                      </li>
                    ) : (
                      <li key={row.item.id} className={i ? 'border-t border-divider' : ''}>
                        <Link to={`/souvenir/${row.item.id}`} className="tap flex items-start gap-3 px-3 py-3 text-text no-underline">
                          <RouteThumb points={row.item.route.points} moments={row.item.route.moments} size={64} />
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-1.5 w-5 shrink-0 rounded-full" style={{ background: colors.get(row.item.id) }} aria-hidden="true" />
                              <span className="title-card truncate">{row.item.name}</span>
                            </span>
                            <span className="text-[0.8824rem] text-muted">{[formatShort(row.item.date), row.item.commune].filter(Boolean).join(' · ')}</span>
                            <Stats items={[{ value: formatRouteDistance(row.item.route.distanceM), label: 'Distance' }, { value: row.item.route.durationMin ? formatDuration(row.item.route.durationMin) : '', label: 'Durée' }]} />
                            <span className="flex flex-wrap gap-1.5">
                              {walkTags(row.item).map((t) => (
                                <span key={t} className="whitespace-nowrap rounded-full bg-bg px-2 py-0.5 text-[0.7647rem] font-semibold text-[#3F4946]">
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
            {/* Les communes viennent d’OpenStreetMap (Nominatim) : la source est dite (V6 § 1). */}
            {visible.some((r) => r.kind === 'balade' && r.item.commune) && <p className="source-note">Lieux © OpenStreetMap</p>}
            {!all && rows.length > PAGE && (
              <button type="button" onClick={() => setAll(true)} className="btn-text self-center px-4">
                Voir les {rows.length - PAGE} plus anciens
              </button>
            )}
          </>
        )}
      </main>
      {viewer !== null && <PhotoViewer photos={photos} start={viewer} onClose={() => setViewer(null)} />}
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
