import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sheet } from '../../components/Sheet'
import { TextField, Optional } from '../../components/Form'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { cleanLiveShares, endLiveShare, pushLivePosition, startLiveShare, updateLivePrivate } from '../../firebase/live'
import { useLivePrivate } from './useLivePrivate'
import { gpsDistance, type GpsPoint } from '../../lib/gpsWalk'
import { activeShare, cleanProche, followLink, MAX_CHOSEN, newToken, pushDue, walkLiveStatus, withNames, type Proche } from '../../lib/liveShare'
import { isNative } from '../../native'
import { FlairNative } from '../../native/flair'

// Partage en direct (T-087, spec V6 § 7) : jamais vers la meute, jamais public, jamais automatique.

/** Toutes les 20 s, on regarde si une mise à jour (une par minute) est due, ou si la balade est finie. */
const TICK_MS = 20_000

/**
 * App iOS, compte du propriétaire : pendant un partage, la position part toutes les 60 s (depuis la balade gardée par
 * l’iPhone, quel que soit l’écran ouvert) ; la balade finie, le partage s’arrête et la position est effacée.
 * À l’ouverture, les partages arrêtés depuis 24 h sont supprimés.
 */
export function LiveShareSync() {
  const priv = useLivePrivate()
  const { pathname } = useLocation()
  const shares = useRef(priv?.liveShares)
  shares.current = priv?.liveShares
  const lastPush = useRef<{ token: string; at: number }>(undefined)

  // Une fois, dès que private/live est lu.
  const loaded = priv !== undefined
  useEffect(() => {
    if (loaded) cleanLiveShares(shares.current, Date.now())
  }, [loaded])

  const active = activeShare(priv?.liveShares, Date.now())
  const token = active?.token
  const sharedAt = active?.startedAt
  useEffect(() => {
    if (!token || !sharedAt || !isNative()) return
    let alive = true
    const tick = async () => {
      const walk = await FlairNative.currentWalk().catch(() => undefined)
      if (!alive || !walk) return
      const status = walkLiveStatus(walk)
      const distanceM = gpsDistance(walk.points)
      if (status === 'terminée') return endLiveShare(token, shares.current, walk.active && !walk.savedAs ? distanceM : undefined)
      const now = Date.now()
      // La création du partage vaut première mise à jour.
      if (!pushDue(lastPush.current?.token === token ? lastPush.current.at : Date.parse(sharedAt), now)) return
      lastPush.current = { token, at: now }
      const here = walk.points[walk.points.length - 1]
      pushLivePosition(token, { ...(here ? { lat: here.lat, lng: here.lng } : {}), distanceM }, status)
    }
    void tick()
    const timer = window.setInterval(() => void tick(), TICK_MS)
    const onVisible = () => document.visibilityState === 'visible' && void tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // Un changement d’écran relance aussi la vérification (fin de balade depuis l’accueil).
  }, [token, sharedAt, pathname])
  return null
}

/** « Partagé en direct avec Coralie · Arrêter » : tant que le partage dure, en haut des onglets et dans la balade. */
export function LiveShareBanner({ className = '' }: { className?: string }) {
  const priv = useLivePrivate()
  const toast = useToast()
  const share = isNative() ? activeShare(priv?.liveShares, Date.now()) : undefined
  if (!share) return null
  return (
    <div role="status" className={`flex min-h-11 items-center gap-2.5 rounded-[16px] bg-primary-soft py-1 pr-1 pl-3.5 text-primary-dark ${className}`}>
      <span aria-hidden="true" className="live-dot size-2.5 shrink-0 rounded-full bg-primary" />
      <span className="min-w-0 flex-1 text-[0.8824rem] font-semibold">Partagé en direct avec {withNames(share.with)}</span>
      <button
        type="button"
        onClick={() => {
          endLiveShare(share.token, priv?.liveShares)
          toast('Partage arrêté')
        }}
        className="btn-text shrink-0 px-3 text-primary-dark"
      >
        Arrêter
      </button>
    </div>
  )
}

/** Dans « Balade en cours » : la ligne « Partager en direct » (éteinte par défaut), ou le bandeau du partage. */
export function LiveShareLine({ startedAt, points }: { startedAt: string; points: GpsPoint[] }) {
  const priv = useLivePrivate()
  const [open, setOpen] = useState(false)
  if (activeShare(priv?.liveShares, Date.now())) return <LiveShareBanner />
  return (
    <>
      <button type="button" role="switch" aria-checked="false" onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-3 border-0 bg-transparent p-0 text-left">
        <span className="flex-1 text-[0.9412rem] font-semibold">Partager en direct</span>
        {/* Un interrupteur éteint : le toucher ouvre le choix des proches. */}
        <span aria-hidden="true" className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-[#D5DCD9]">
          <span className="absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
        </span>
      </button>
      {open && <LiveShareSheet startedAt={startedAt} points={points} onClose={() => setOpen(false)} />}
    </>
  )
}

/** Le formulaire d’un proche : prénom, numéro ou e-mail. Gardé dans private/live (Profil › Mes proches). */
export function ProcheForm({ proches, onAdded }: { proches: Proche[] | undefined; onAdded?: (proche: Proche) => void }) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const add = () => {
    const proche = cleanProche({ name, contact }, newToken().slice(0, 10))
    if (!proche) return setError('Écrivez au moins un prénom.')
    updateLivePrivate({ proches: [...(proches ?? []), proche] })
    setName('')
    setContact('')
    setError('')
    onAdded?.(proche)
  }
  return (
    <div className="flex flex-col gap-3">
      <TextField label="Prénom" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={40} {...(error ? { error } : {})} />
      <TextField label={<>Numéro ou e-mail<Optional /></>} value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="off" inputMode="email" maxLength={80} />
      <button type="button" onClick={add} className="btn btn-outline min-h-12">
        Ajouter ce proche
      </button>
    </div>
  )
}

/** Le panneau : choisir une ou deux personnes dans « Mes proches », puis « Partager » (feuille de partage d’iOS). */
function LiveShareSheet({ startedAt, points, onClose }: { startedAt: string; points: GpsPoint[]; onClose: () => void }) {
  const { dog } = useData()
  const priv = useLivePrivate()
  const toast = useToast()
  const proches = priv?.proches ?? []
  const [chosen, setChosen] = useState<string[]>(() => (proches.length === 1 ? [proches[0]!.id] : []))
  const [adding, setAdding] = useState(proches.length === 0)
  const [link, setLink] = useState('')

  const toggle = (id: string) => setChosen((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < MAX_CHOSEN ? [...list, id] : list))

  const share = () => {
    const names = proches.filter((p) => chosen.includes(p.id)).map((p) => p.name)
    if (!names.length) return
    const token = newToken()
    const url = followLink(token, window.location)
    const here = points[points.length - 1]
    startLiveShare(token, { dogName: dog.name, ...(priv?.ownerName ? { ownerName: priv.ownerName } : {}), startedAt, ...(here ? { lat: here.lat, lng: here.lng } : {}), distanceM: gpsDistance(points) }, names, priv?.liveShares)
    // Rien n’est attendu avant d’ouvrir la feuille de partage d’iOS (elle doit suivre le toucher).
    if (navigator.share) {
      navigator
        .share({ title: `La balade de ${dog.name}`, text: `Suivez la balade de ${dog.name} en direct`, url })
        .then(() => {
          toast('Lien partagé')
          onClose()
        })
        .catch((error: unknown) => {
          // Feuille fermée sans envoyer : le lien ne part pas, le partage s’arrête tout de suite.
          if (error instanceof DOMException && error.name === 'AbortError') endLiveShare(token, [...(priv?.liveShares ?? []), { token, startedAt: new Date().toISOString(), with: names }])
          else showLink(url)
        })
    } else showLink(url)
  }
  const showLink = (url: string) => {
    setLink(url)
    navigator.clipboard?.writeText(url).then(() => toast('Lien copié'), () => undefined)
  }

  if (link)
    return (
      <Sheet label="Lien à envoyer" onClose={onClose}>
        <h2 className="title-section mt-1">Lien à envoyer</h2>
        <p className="text-[0.9412rem] leading-snug text-[#3F4946]">Envoyez-le par Messages ou WhatsApp. Il s’arrête à la fin de la balade.</p>
        <p className="card px-4 py-3 text-[0.8824rem] break-all select-all" data-testid="lien-suivre">
          {link}
        </p>
        <button type="button" onClick={onClose} className="btn btn-main min-h-14">
          C’est envoyé
        </button>
      </Sheet>
    )

  return (
    <Sheet label="Partager en direct" onClose={onClose}>
      <h2 className="title-section mt-1">Partager en direct</h2>
      <p className="text-[0.9412rem] leading-snug text-[#3F4946]">Vos proches voient où vous êtes et depuis quand, sans compte. Rien d’autre. Le lien s’arrête à la fin de la balade.</p>
      {proches.length > 0 && (
        <fieldset className="m-0 flex flex-col border-0 p-0">
          <legend className="mb-1 text-[0.8824rem] font-semibold">Une ou deux personnes</legend>
          {proches.map((p, i) => {
            const on = chosen.includes(p.id)
            return (
              <label key={p.id} className={`flex min-h-14 items-center gap-3 py-2 ${i ? 'border-t border-divider' : ''}`}>
                <input type="checkbox" checked={on} disabled={!on && chosen.length >= MAX_CHOSEN} onChange={() => toggle(p.id)} className="size-6 shrink-0 accent-primary" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-semibold">{p.name}</span>
                  {p.contact && <span className="truncate text-[0.7647rem] text-muted">{p.contact}</span>}
                </span>
              </label>
            )
          })}
        </fieldset>
      )}
      {adding ? (
        <ProcheForm
          proches={priv?.proches}
          onAdded={(p) => {
            setAdding(false)
            setChosen((list) => (list.length < MAX_CHOSEN ? [...list, p.id] : list))
          }}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-text self-start -ml-1">
          Ajouter un proche
        </button>
      )}
      <button type="button" onClick={share} disabled={chosen.length === 0} className="btn btn-main min-h-14">
        Partager
      </button>
    </Sheet>
  )
}
