import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckIcon, MapIcon } from '../../components/Icons'
import { useData } from '../../firebase/store'
import { trackThumb } from '../../lib/trackThumb'
import type { WalkDayPlan, WalkDaySlot } from '../../lib/walkDay'
import { walkItems } from '../../lib/walkList'

const THUMB = 88

function SlotStatus({ slot }: { slot: WalkDaySlot }) {
  if (slot.state === 'faite')
    return (
      <span className="flex items-center gap-1 text-[15px] font-bold text-primary">
        <CheckIcon size={18} />
        {slot.minutes ? `${slot.minutes} min` : 'Faite'}
      </span>
    )
  if (slot.state === 'manquee') return <span className="text-[15px] text-muted">Pas faite</span>
  return <span className="text-[15px] font-bold">{slot.minutes === undefined ? 'À faire' : slot.minutes ? `${slot.minutes} min` : 'Juste ses besoins'}</span>
}

/**
 * « Ses sorties du jour » (T-035), en haut de l’accueil : les 3 sorties avec leur durée (faite ou conseillée), le temps
 * de marche du jour, un conseil, et l’aperçu de ses tracés qui ouvre la carte.
 */
export function WalkDayCard({ plan }: { plan: WalkDayPlan }) {
  const { entries } = useData()
  const walks = useMemo(() => walkItems(entries), [entries])
  const tracks = useMemo(() => trackThumb(walks.map((w) => w.route.points), THUMB), [walks])
  const done = plan.slots.filter((s) => s.state === 'faite').length
  const progress = Math.min(1, plan.daily ? plan.walked / plan.daily : done / 3)

  return (
    <section aria-label="Ses sorties du jour" className="card flex flex-col gap-3 rounded-[26px] p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-display text-[20px] leading-tight font-extrabold">Ses sorties du jour</h2>
          <p className="text-[15px] leading-snug text-[#3F4946]">{plan.summary}</p>
        </div>
        {tracks.length > 0 && (
          <Link to="/territoire" aria-label="Ouvrir la carte de ses balades" className="tap shrink-0 overflow-hidden rounded-[16px]">
            <svg width={THUMB} height={THUMB} viewBox={`0 0 ${THUMB} ${THUMB}`} aria-hidden="true" className="block bg-[#22332F]">
              {/* Les plus anciennes en crème, la dernière en doré par-dessus. */}
              {tracks
                .map((d, i) => <path key={i} d={d} fill="none" stroke={i === 0 ? '#F2B544' : '#F6E7C8'} strokeOpacity={i === 0 ? 1 : 0.55} strokeWidth={i === 0 ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round" />)
                .reverse()}
            </svg>
          </Link>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E3E6E4]" aria-hidden="true">
        <div className="h-full origin-left rounded-full bg-primary transition-transform duration-500" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {plan.slots.map((slot) => (
          <li key={slot.slot} className="grid min-h-11 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2 border-0 border-b border-solid border-[#EDF0EE] last:border-b-0">
            <span className={`text-[15px] font-extrabold ${slot.state === 'manquee' ? 'text-muted' : 'text-primary'}`}>{slot.hour}</span>
            <span className={`truncate text-[15px] ${slot.state === 'manquee' ? 'text-muted' : ''}`}>{slot.name}</span>
            <SlotStatus slot={slot} />
          </li>
        ))}
      </ul>
      <p className="text-[14px] leading-snug text-[#3F4946]">{plan.tip}</p>
      <Link to={walks.length ? '/territoire' : '/importer'} className="tap btn btn-outline min-h-12 gap-2">
        <MapIcon size={20} />
        {walks.length ? 'Explorer la carte' : 'Importer mes balades'}
      </Link>
    </section>
  )
}
