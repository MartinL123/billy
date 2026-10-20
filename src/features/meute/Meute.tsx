import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BonesGained } from '../../components/BoneIcon'
import { CheckIcon, ChevronRightIcon, PinIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { auth } from '../../firebase/app'
import { addSpot, markSpot, voteCalm, type Spot, type WithId } from '../../firebase/community'
import { updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { markBone } from '../../lib/bones'
import { calmSummary, CALM_LEVELS, categoryInfo, distanceMeters, dogColor, formatDistance, markId, MARK_DAYS_ON_MAP, nearbySpots, slotOf, SPOT_CATEGORIES, SPOT_INFOS, type CalmLevel, type SpotCategory } from '../../lib/community'
import { diffDays } from '../../lib/dates'
import { readRoute, storeRoute, withMarkMoments } from '../../lib/route'
import { weekId, weekOf } from '../../lib/rhythm'
import { useToday } from '../../lib/useToday'
import { FeedPhoto } from './FeedPhoto'
import { MemberAvatar } from './MemberAvatar'
import { usePack } from './usePack'
import { place } from '../../lib/garden'
import { ofName } from '../../lib/gender'
import { APP_NAME } from '../../appName'

type LatLng = { lat: number; lng: number }
const WELCOME_KEY = 'billy.meute.bienvenue'

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
const writeFlag = (key: string) => {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Stockage indisponible : l’accueil de la meute reviendra, rien de grave.
  }
}

type Filter = 'tout' | 'calme' | SpotCategory | 'territoire'

/** La meute (docs/specs/communaute.md § 3) : les spots (sur la carte de Balades), Marquer, le fil du jour, les chiens. */
export default function Meute() {
  const { dog, entries } = useData()
  const today = useToday()
  const toast = useToast()
  const me = auth.currentUser?.uid ?? ''
  const week = weekId(today)
  const { members, spots, marks, feed, calm } = usePack(week)

  const [welcome, setWelcome] = useState(() => !readFlag(WELCOME_KEY))
  const [position, setPosition] = useState<LatLng | null>(null)
  const [filter, setFilter] = useState<Filter>('tout')
  // « Un spot calme pour ça » (depuis une mission) ouvre directement le spot.
  const [params] = useSearchParams()
  const [openSpot, setOpenSpot] = useState<string | null>(() => params.get('spot'))
  const [marking, setMarking] = useState(false)
  const [newSpot, setNewSpot] = useState<LatLng | null>(null)
  const [marked, setMarked] = useState<{ spot: string; bones: number; first: boolean } | null>(null)
  const [locating, setLocating] = useState('')

  const memberOf = (uid: string) => members.find((m) => m.id === uid)
  const mine = marks.filter((m) => m.uid === me)
  const territory = useMemo(() => new Set(mine.map((m) => m.spotId)), [mine])
  const recent = marks.filter((m) => diffDays(m.date, today) < MARK_DAYS_ON_MAP)
  const drops = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const m of recent) out[m.spotId] = [...new Set([...(out[m.spotId] ?? []), memberOf(m.uid)?.color ?? dogColor(m.uid)])]
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent.length, members])
  const calmOf = (id: string) => calmSummary(calm[id] ?? [])
  const shown = spots.filter((s) => filter === 'tout' || (filter === 'calme' ? calmOf(s.id)?.headline.startsWith('Plutôt calme') : filter === 'territoire' ? territory.has(s.id) : s.category === filter))

  // « Ma position » : centre la carte, sans rien partager ni enregistrer.
  const locate = (then?: (here: LatLng) => void) => {
    if (!('geolocation' in navigator)) return setLocating('La position n’est pas disponible sur cet appareil.')
    setLocating('Recherche de votre position…')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude }
        setPosition(here)
        setLocating('')
        then?.(here)
      },
      () => setLocating('Position refusée : vous pouvez choisir le spot dans la liste.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  const mark = (spot: WithId<Spot>) => {
    const id = markId(me, spot.id, today)
    if (marks.some((m) => m.id === id)) {
      setMarking(false)
      return toast(`${dog.name} a déjà marqué ce spot aujourd’hui.`)
    }
    const first = !territory.has(spot.id)
    const gain = markBone(spot.id, today, first)
    markSpot(id, { spotId: spot.id, uid: me, dogName: dog.name, date: today }, gain)
    // Une balade d’aujourd’hui déjà tracée qui passe par ce spot : « A marqué » s’y ajoute tout seul.
    for (const entry of entries) {
      const route = entry.date === today ? readRoute(entry.route) : undefined
      const next = route && withMarkMoments(route, [spot])
      if (route && next && next !== route) updateEntryRoute(entry.id, storeRoute(next))
    }
    setMarking(false)
    setOpenSpot(null)
    setMarked({ spot: spot.name, bones: gain.amount, first })
  }

  const close = () => {
    writeFlag(WELCOME_KEY)
    setWelcome(false)
  }

  if (welcome) {
    return (
      <div className="flex flex-col gap-5 px-5">
        <h1 className="font-display text-[1.8824rem] font-extrabold">La meute</h1>
        <p className="text-[1rem] leading-snug text-[#3F4946]">La meute, ce sont les amis qui ont un compte {APP_NAME}. Pas d’invitation, pas de classement.</p>
        <ul className="card m-0 flex list-none flex-col gap-3.5 p-4">
          {[
            ['Les bons spots', 'Les balades, parcs et cafés que la meute aime, avec leur niveau de calme.'],
            ['Marquer', 'Comme un chien qui marque son passage : on choisit un spot proche, et on gagne des os.'],
            ['Rien de public', 'Seule la meute voit les marques, avec le jour, jamais l’heure ni votre position.'],
          ].map(([title, text]) => (
            <li key={title} className="flex gap-3">
              <CheckIcon size={22} className="mt-0.5 shrink-0 text-primary" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[1rem] font-bold">{title}</span>
                <span className="text-[0.8824rem] leading-snug text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[0.8824rem] leading-snug text-muted">Votre position sert seulement à trier les spots par distance et à proposer ceux tout proches. Elle n’est jamais enregistrée ni partagée.</p>
        <button
          type="button"
          onClick={() => {
            close()
            locate()
          }}
          className="btn btn-main"
        >
          Autoriser ma position
        </button>
        <button type="button" onClick={close} className="btn btn-outline">
          Plus tard
        </button>
      </div>
    )
  }

  const nearby = position ? nearbySpots(spots, position) : [...spots].sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ ...s, meters: NaN }))
  const todayMarks = marks.filter((m) => m.date === today)
  const others = members.filter((m) => m.id !== me)
  const spotName = (id: string) => spots.find((s) => s.id === id)?.name ?? 'un spot'
  const open = spots.find((s) => s.id === openSpot)
  const weekDays = weekOf(today)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5 px-5">
        <h1 className="font-display text-[1.8824rem] font-extrabold">La meute</h1>
        <p className="text-[0.8824rem] text-muted">
          {members.length} chien{members.length > 1 ? 's' : ''} · seulement les amis qui ont un compte
        </p>
      </header>

      {/* La carte des spots est celle de Balades (une seule carte dans l’app) : calque « Spots de la meute ». */}
      <div className="flex gap-2 px-5">
        <Link to="/territoire?meute=1" className="btn btn-outline min-h-14 flex-1">
          Voir sur la carte
        </Link>
        <button type="button" onClick={() => setMarking(true)} className="btn btn-main min-h-14 flex-1 gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
          </svg>
          Marquer
        </button>
      </div>
      {locating && (
        <p role="status" className="px-5 text-[0.8824rem] text-muted">
          {locating}
        </p>
      )}

      <div role="group" aria-label="Filtrer les spots" className="scroll-row flex gap-2 px-5 pb-1">
        {([['tout', 'Tout'], ['calme', 'Calme'], ...SPOT_CATEGORIES.filter((c) => c.id !== 'eviter').map((c) => [c.id, c.filter]), ['territoire', `Territoire ${ofName(dog.name)}`]] as [Filter, string][]).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-12 shrink-0 rounded-full px-4 text-[0.8824rem] font-bold whitespace-nowrap ${filter === id ? 'border-0 bg-primary text-white' : 'border-2 border-solid border-border bg-surface text-text'}`}>
            {label}
          </button>
        ))}
      </div>

      <section aria-label="Les spots" className="flex flex-col gap-2 px-5">
        {shown.length === 0 ? (
          <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[0.8824rem] leading-snug text-[#1D3F73]">Aucun spot ici. Touchez « Marquer » puis « Nouveau spot ici » pendant une balade.</p>
        ) : (
          <ul className="card m-0 flex list-none flex-col p-0">
            {(position ? shown.map((s) => ({ ...s, meters: distanceMeters(position, s) })).sort((a, b) => a.meters - b.meters) : [...shown].sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ ...s, meters: NaN }))).map((s, i) => (
              <li key={s.id} className={i ? 'border-t border-divider' : ''}>
                <button type="button" onClick={() => setOpenSpot(s.id)} className="flex min-h-14 w-full items-center gap-3 border-0 bg-transparent px-4 py-2 text-left text-text">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: categoryInfo(s.category).color }} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[1rem] font-bold">{s.name}</span>
                    <span className="text-sm text-muted">
                      {categoryInfo(s.category).label}
                      {Number.isFinite(s.meters) ? ` · ${formatDistance(s.meters)}` : ''}
                      {drops[s.id]?.length ? ' · marqué récemment' : ''}
                    </span>
                  </span>
                  <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sans heure, jamais : « aujourd’hui », c’est tout. */}
      <section className="flex flex-col gap-2.5 px-5">
        <h2 className="text-xl font-bold">Aujourd’hui dans la meute</h2>
        <div className="card flex flex-col p-1">
          {todayMarks.length === 0 && feed.filter((f) => diffDays(f.date, today) <= 1).length === 0 ? (
            <p className="px-3 py-3 text-[0.8824rem] text-muted">Rien encore aujourd’hui. Touchez « Marquer » pendant votre balade.</p>
          ) : (
            <>
              {todayMarks.map((m) => {
                const together = m.uid !== me && todayMarks.some((x) => x.uid === me && x.spotId === m.spotId)
                const member = memberOf(m.uid)
                return (
                  <p key={m.id} className="flex items-center gap-3 px-3 py-2.5 text-[0.8824rem] leading-snug">
                    {member && <MemberAvatar member={member} size={32} />}
                    <span>{together ? `${dog.name} et ${m.dogName} sont passés au même spot aujourd’hui · ${spotName(m.spotId)}` : `${m.dogName} a marqué ${spotName(m.spotId)} aujourd’hui`}</span>
                  </p>
                )
              })}
              {feed
                .filter((f) => diffDays(f.date, today) <= 1)
                .map((f) => {
                  const member = memberOf(f.uid)
                  return (
                    <div key={f.id} className="flex items-start gap-3 px-3 py-2.5 text-[0.8824rem] leading-snug">
                      {member && <MemberAvatar member={member} size={32} />}
                      <span className="min-w-0 flex-1">
                        <strong>{f.dogName}</strong> · {f.date === today ? "aujourd’hui" : 'hier'} : {f.text}
                      </span>
                      {f.photo && <FeedPhoto photo={f.photo} size={56} />}
                    </div>
                  )
                })}
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2.5 px-5">
        <h2 className="text-xl font-bold">La meute</h2>
        {others.length === 0 && <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[0.8824rem] leading-snug text-[#1D3F73]">Vous êtes seul pour l’instant. Martin peut créer un compte pour un ami.</p>}
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <Link key={m.id} to={`/meute/chien/${m.id}`} className="card-link">
              <MemberAvatar member={m} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[1rem] font-bold">
                  {m.dogName}
                  {m.id === me ? ' (vous)' : ''}
                </span>
                {m.breed && <span className="text-sm text-muted">{m.breed}</span>}
              </span>
              <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
            </Link>
          ))}
        </div>
      </section>

      {open && (
        <SpotSheet
          spot={open}
          meters={position ? nearbySpots([open], position)[0]?.meters ?? Infinity : undefined}
          addedBy={memberOf(open.createdBy)?.dogName}
          passed={[...new Set(marks.filter((m) => m.spotId === open.id && weekDays.includes(m.date)).map((m) => m.dogName))]}
          passedToday={marks.some((m) => m.spotId === open.id && m.date === today)}
          calm={calmOf(open.id)}
          canMark={!position || nearbySpots([open], position).length > 0}
          onVote={(level) => voteCalm(open.id, { level, slot: slotOf(new Date().getHours()), date: today })}
          onMark={() => mark(open)}
          onClose={() => setOpenSpot(null)}
        />
      )}

      {marking && (
        <Sheet label={place(`Où ${dog.name} marque-t-il ?`)} onClose={() => setMarking(false)}>
          <h2 className="mt-1 font-display text-[1.4118rem] font-extrabold">{place(`Où ${dog.name} marque-t-il ?`)}</h2>
          <p className="text-[0.8824rem] text-muted">{position ? 'Les spots de la meute à moins de 300 m.' : 'Sans votre position, choisissez le spot où vous êtes.'}</p>
          {position === null && (
            <button type="button" onClick={() => locate()} className="btn btn-outline">
              <PinIcon size={18} />
              Utiliser ma position
            </button>
          )}
          <div className="flex flex-col gap-2">
            {nearby.length === 0 && <p className="rounded-[14px] bg-bg px-3.5 py-3 text-[0.8824rem]">Aucun spot de la meute ici. Créez-le !</p>}
            {nearby.map((s) => (
              <button key={s.id} type="button" onClick={() => mark(s)} className="flex min-h-14 items-center gap-3 rounded-[18px] border-2 border-solid border-border bg-surface px-4 text-left">
                <span className="size-3 shrink-0 rounded-full" style={{ background: categoryInfo(s.category).color }} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[1rem] font-bold">{s.name}</span>
                  <span className="text-sm text-muted">
                    {categoryInfo(s.category).label}
                    {Number.isFinite(s.meters) ? ` · ${formatDistance(s.meters)}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setMarking(false)
              // Le nouveau spot se pose là où vous êtes : la position est nécessaire.
              if (position) setNewSpot(position)
              else locate((here) => setNewSpot(here))
            }}
            className="btn btn-outline"
          >
            Nouveau spot ici
          </button>
          <p className="text-[0.7647rem] leading-snug text-muted">Seule votre meute voit les marques, avec le jour, jamais l’heure ni votre position.</p>
        </Sheet>
      )}

      {newSpot && (
        <NewSpotSheet
          onCancel={() => setNewSpot(null)}
          onCreate={(spot, calmNow) => {
            const id = addSpot({ ...spot, lat: newSpot.lat, lng: newSpot.lng })
            if (calmNow) voteCalm(id, { level: calmNow, slot: slotOf(new Date().getHours()), date: today })
            setNewSpot(null)
            mark({ ...spot, lat: newSpot.lat, lng: newSpot.lng, id, createdBy: me, createdAt: '' })
          }}
        />
      )}

      {marked && (
        <div role="dialog" aria-modal="true" aria-label="Spot marqué" onClick={() => setMarked(null)} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-primary-dark px-8 text-center text-white">
          <svg width="96" height="96" viewBox="0 0 24 24" aria-hidden="true" className="cel-badge">
            <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" fill="#F2B544" />
          </svg>
          <h1 className="cel-text font-display text-[1.7647rem] leading-tight font-extrabold">
            {dog.name} a marqué {marked.spot} !
          </h1>
          {marked.first && <p className="cel-text text-[1rem] text-[#F7D58A]">Nouveau spot pour {dog.name}</p>}
          <p className="cel-text text-xl">
            <BonesGained amount={marked.bones} />
          </p>
          <button type="button" onClick={() => setMarked(null)} className="mt-6 flex min-h-[60px] w-full max-w-[360px] items-center justify-center rounded-full border-0 bg-gold text-[1.1176rem] font-extrabold text-gold-dark">
            Continuer
          </button>
        </div>
      )}
    </div>
  )
}

function SpotSheet({ spot, meters, addedBy, passed, passedToday, calm, canMark, onVote, onMark, onClose }: {
  spot: WithId<Spot>
  meters?: number
  addedBy?: string
  passed: string[]
  passedToday: boolean
  calm?: { headline: string; detail: string }
  canMark: boolean
  onVote: (level: CalmLevel) => void
  onMark: () => void
  onClose: () => void
}) {
  const info = categoryInfo(spot.category)
  const [voted, setVoted] = useState<CalmLevel | null>(null)
  const slot = slotOf(new Date().getHours())
  return (
    <Sheet label={spot.name} onClose={onClose}>
      <h2 className="mt-1 font-display text-[1.4118rem] leading-tight font-extrabold">{spot.name}</h2>
      <p className="text-[0.8824rem] text-muted">{[info.label, meters !== undefined && Number.isFinite(meters) ? formatDistance(meters) : '', addedBy ? `ajouté par ${addedBy}` : ''].filter(Boolean).join(' · ')}</p>
      <section className="rounded-[18px] bg-bg p-3.5">
        <h3 className="text-[0.7647rem] font-bold tracking-[0.5px] text-muted uppercase">Niveau de calme</h3>
        {calm ? (
          <>
            <p className="text-[1rem] font-bold">{calm.headline}</p>
            <p className="text-sm text-muted">{calm.detail}</p>
          </>
        ) : (
          <p className="text-[0.8824rem]">Pas encore d’avis.</p>
        )}
      </section>
      {spot.info.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {spot.info.map((i) => (
            <span key={i} className="rounded-xl bg-primary-soft px-2.5 py-1 text-sm font-semibold text-primary-dark">
              {i}
            </span>
          ))}
        </div>
      )}
      {passed.length > 0 && (
        <p className="text-[0.8824rem]">
          <strong>Passés ici cette semaine :</strong> {passed.join(', ')}
          {passedToday ? ' · dont aujourd’hui' : ''}
        </p>
      )}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-[0.8824rem] font-bold">{slot === 'tot' || slot === 'matin' ? 'Ce matin' : slot === 'midi' ? 'Cet après-midi' : 'Ce soir'}, c’était…</legend>
        <div className="grid grid-cols-3 gap-2">
          {CALM_LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={voted === l.id}
              onClick={() => {
                setVoted(l.id)
                onVote(l.id)
              }}
              className={`btn px-2 ${voted === l.id ? 'btn-on' : 'btn-outline'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Link to={`/territoire?spot=${spot.id}`} className="btn btn-outline">
        Voir sur la carte
      </Link>
      {canMark ? (
        <button type="button" onClick={onMark} className="btn btn-main">
          Marquer ce spot
        </button>
      ) : (
        <p className="rounded-[14px] bg-bg px-3.5 py-3 text-center text-[0.8824rem] text-muted">Approchez-vous à moins de 300 m pour marquer ce spot.</p>
      )}
    </Sheet>
  )
}

function NewSpotSheet({ onCancel, onCreate }: { onCancel: () => void; onCreate: (spot: Omit<Spot, 'lat' | 'lng' | 'createdBy' | 'createdAt'>, calmNow: CalmLevel | null) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<SpotCategory>('balade')
  const [calmNow, setCalmNow] = useState<CalmLevel | null>(null)
  const [info, setInfo] = useState<string[]>([])
  const [error, setError] = useState('')
  const create = () => {
    if (!name.trim()) return setError('Donnez un nom au spot.')
    if (/maison|chez moi|domicile/i.test(name)) return setError('Un spot est un lieu public, jamais un domicile.')
    onCreate({ name: name.trim(), category, info }, calmNow)
  }
  return (
    <Sheet label="Nouveau spot" onClose={onCancel}>
      <h2 className="mt-1 font-display text-[1.4118rem] font-extrabold">Nouveau spot</h2>
      <p className="text-[0.8824rem] text-muted">Un lieu public que la meute peut retrouver. Jamais un domicile.</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.8824rem] font-semibold">Son nom</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grand Parc des Docks" autoComplete="off" className={`field ${error ? 'border-danger' : ''}`} />
      </label>
      {error && (
        <p role="alert" className="text-[0.8824rem] font-semibold text-danger">
          {error}
        </p>
      )}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-[0.8824rem] font-semibold">Catégorie</legend>
        <div className="grid grid-cols-2 gap-2">
          {SPOT_CATEGORIES.map((c) => (
            <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={`flex min-h-12 items-center gap-2 rounded-[14px] border-2 border-solid px-3 text-left text-[0.8824rem] font-bold ${category === c.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}>
              <span className="size-3 shrink-0 rounded-full" style={{ background: category === c.id ? '#FFFFFF' : c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-[0.8824rem] font-semibold">En ce moment, c’est…</legend>
        <div className="grid grid-cols-3 gap-2">
          {CALM_LEVELS.map((l) => (
            <button key={l.id} type="button" aria-pressed={calmNow === l.id} onClick={() => setCalmNow(calmNow === l.id ? null : l.id)} className={`btn px-2 ${calmNow === l.id ? 'btn-on' : 'btn-outline'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-[0.8824rem] font-semibold">
          Infos <span className="font-normal text-muted">(facultatif)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SPOT_INFOS.map((i) => {
            const on = info.includes(i)
            return (
              <button key={i} type="button" aria-pressed={on} onClick={() => setInfo(on ? info.filter((x) => x !== i) : [...info, i])} className={`min-h-11 rounded-full border-2 border-solid px-3.5 text-[0.8824rem] font-semibold ${on ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}>
                {i}
              </button>
            )
          })}
        </div>
      </fieldset>
      <button type="button" onClick={create} className="btn btn-main mt-1">
        Créer et marquer ce spot
      </button>
      <button type="button" onClick={onCancel} className="btn btn-outline">
        Annuler
      </button>
    </Sheet>
  )
}

