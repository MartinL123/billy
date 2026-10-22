import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { healthTile, memoriesLine, memoriesTile, progressLine, walksLine } from '../../lib/dashboard'
import { useToday } from '../../lib/useToday'
import { walkItems } from '../../lib/walkList'
import { APP_NAME } from '../../appName'
import { isNative } from '../../native'
import { watchLooksBlocked, watchOptedIn } from '../balades/watchImport'
import { useReadOnly } from '../../firebase/viewer'

const STROKE = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Les icônes des tuiles (traits, comme le reste de l’app). */
const ICONS = {
  progres: (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#1E5A50" {...STROKE} aria-hidden="true">
      <path d="M12 22V12" />
      <path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7z" />
      <path d="M12 15c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z" />
    </svg>
  ),
  balades: (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#2559A8" {...STROKE} aria-hidden="true">
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  ),
  sante: (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#B34A10" {...STROKE} aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  ),
  souvenirs: (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#8A6514" {...STROKE} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  ),
  boutique: (
    <svg width="22" height="22" viewBox="0 0 24 24" stroke="#8A6514" {...STROKE} aria-hidden="true">
      <path d="M4 9h16l-1.5 10h-13z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  ),
  meute: (
    <svg width="22" height="22" viewBox="0 0 24 24" stroke="#1E5A50" {...STROKE} aria-hidden="true">
      <circle cx="8" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 19c0-3 2.5-5 5-5s5 2 5 5" />
      <path d="M14 19c0-2 1.5-4 3-4s4 2 4 4" />
    </svg>
  ),
}

/** Une ligne de « Sa vie avec vous » : icône dans un carré de couleur, titre, détail, chevron. */
function Row({ to, icon, tint, title, detail, alert = false, last = false }: { to: string; icon: React.ReactNode; tint: string; title: string; detail: string; /** Le détail en rouge (un soin en retard). */ alert?: boolean; last?: boolean }) {
  return (
    <Link to={to} className={`tap flex min-h-16 items-center gap-3 px-4 py-2.5 text-text no-underline ${last ? '' : 'border-b border-divider'}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: tint }}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="title-card">{title}</span>
        {/* Seul un soin en retard est en rouge (R-039). */}
        <span className={`text-[0.8235rem] leading-snug ${alert ? 'font-bold text-danger' : 'text-[#3F4946]'}`}>{detail}</span>
      </span>
      <ChevronRightIcon size={20} className="shrink-0 text-[#5A6662]" />
    </Link>
  )
}

/**
 * « Sa vie avec vous » (V5, T-050) : 4 lignes dans une seule carte. La boutique et la meute sont passées dans l’écran
 * de Billy (et la pastille d’os de l’en-tête) ; « Noter un souvenir » est dans l’écran des souvenirs.
 */
export function LifeTiles({ arrival = false }: { /** Première ouverture du jour : la carte monte avec la cascade (T-033). */ arrival?: boolean }) {
  const readOnly = useReadOnly()
  const { dog, bossProgress, entries, events } = useData()
  const today = useToday()
  const walks = useMemo(() => walkItems(entries), [entries])
  const active = activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress)
  // App iOS : aucune séance trouvée dans Santé, la lecture n’est sans doute pas autorisée (T-001). Une ligne, pas de popup.
  const watchHint = isNative() && watchOptedIn() && watchLooksBlocked() ? `Autoriser ${APP_NAME} à lire vos marches (Réglages › Santé)` : undefined
  const sante = healthTile(events, today)
  const memories = memoriesTile(entries, today)

  return (
    <>
      <h2 className="title-section mt-1">Sa vie avec vous</h2>
      <nav aria-label="Sa vie avec vous" className={`card flex flex-col p-0 ${arrival ? 'anim-in' : ''}`}>
        <Row to="/billy" icon={ICONS.progres} tint="#DCEBE6" title="Ses progrès" detail={progressLine(active)} />
        <Row to={walks.length || readOnly ? '/territoire' : '/importer'} icon={ICONS.balades} tint="#E3EAF8" title="Ses balades" detail={watchHint ?? walksLine(walks.map((w) => w.route))} />
        <Row to="/sante" icon={ICONS.sante} tint="#FBE6D4" title="Sa santé" detail={sante.text} alert={sante.late} />
        {/* Visiteur (R-073) : rien à noter, seulement à regarder. */}
        <Row to={memories.count || readOnly ? '/balades' : '/noter'} icon={ICONS.souvenirs} tint="#FCEFD3" title="Ses souvenirs" detail={memories.count ? memoriesLine(entries) : readOnly ? 'Pas encore de souvenir' : 'Noter le premier'} last />
      </nav>
    </>
  )
}
