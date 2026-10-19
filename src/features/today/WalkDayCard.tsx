import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BonesGained } from '../../components/BoneIcon'
import { CheckIcon, MapIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { noteWalk } from '../../firebase/imports'
import { useData } from '../../firebase/store'
import type { ISODate } from '../../lib/dates'
import { trackThumb } from '../../lib/trackThumb'
import { DURATION_CHOICES, preselectedDuration, type WalkDayPlan, type WalkDaySlot } from '../../lib/walkDay'
import { walkItems } from '../../lib/walkList'
import { formatHour, walkName, type WalkSlot, type WalkTimes } from '../../lib/walks'
import { useToday } from '../../lib/useToday'
import { isNative } from '../../native'

const THUMB = 88

/** Une sortie à noter (R-044) : d’aujourd’hui, ou d’hier le matin. */
interface ToNote {
  date: ISODate
  slot: WalkSlot
  time: string
  name: string
  advised?: number
}

const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}` : `${m} min`)

/** « + Je l’ai faite » : un bouton contour, à droite de la sortie. */
function NoteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="tap min-h-11 shrink-0 rounded-full border-2 border-solid border-primary bg-surface px-3.5 text-[15px] font-bold text-primary">
      + Je l’ai faite
    </button>
  )
}

function SlotRow({ slot, onNote }: { slot: WalkDaySlot; onNote: () => void }) {
  const open = slot.state !== 'faite'
  return (
    <li className="grid min-h-[52px] grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 border-0 border-b border-solid border-[#EDF0EE] py-1 last:border-b-0">
      <span className={`text-[15px] font-extrabold ${slot.state === 'manquee' ? 'text-muted' : 'text-primary'}`}>{slot.hour}</span>
      <span className="flex min-w-0 flex-col">
        <span className={`text-[15px] leading-tight ${slot.state === 'manquee' ? 'text-[#3F4946]' : ''}`}>{slot.name}</span>
        {/* À venir : la durée conseillée, sous le nom (le bouton prend la place à droite). */}
        {slot.state === 'a-venir' && slot.minutes !== undefined && <span className="text-[13px] text-[#3F4946]">{slot.minutes ? `${slot.minutes} min conseillées` : 'Juste ses besoins'}</span>}
      </span>
      {open ? (
        <NoteButton onClick={onNote} label={`${slot.name} : je l’ai faite`} />
      ) : (
        <span className="flex flex-col items-end">
          <span className="flex items-center gap-1 text-[15px] font-bold text-primary">
            <CheckIcon size={18} />
            {slot.minutes ? minutesText(slot.minutes) : 'Faite'}
          </span>
          {slot.noted && <span className="text-[13px] text-[#3F4946]">notée, sans tracé</span>}
        </span>
      )}
    </li>
  )
}

/** « Combien de temps ? » : 10, 15, 25, 40 min, 1 h ou Autre ; la durée conseillée présélectionnée. */
function NoteSheet({ walk, onClose }: { walk: ToNote; onClose: () => void }) {
  const { bones } = useData()
  const today = useToday()
  const toast = useToast()
  const [pick, setPick] = useState<number | 'autre'>(preselectedDuration(walk.advised))
  const [other, setOther] = useState('')
  const minutes = pick === 'autre' ? Math.round(Number(other)) : pick
  const valid = Number.isFinite(minutes) && minutes >= 1 && minutes <= 300

  const save = () => {
    if (!valid) return
    const gains = noteWalk({ date: walk.date, slot: walk.slot, minutes, time: walk.time }, bones, today)
    const label = `${walk.name} notée`
    const amount = gains.reduce((sum, g) => sum + g.amount, 0)
    toast(amount ? <BonesGained label={label} amount={amount} /> : label, undefined, amount ? { bones: true } : undefined)
    onClose()
  }

  const choice = (on: boolean) => `tap min-h-[52px] rounded-[16px] border-2 border-solid text-[17px] font-extrabold ${on ? 'border-primary bg-primary-soft text-primary' : 'border-[#D5DBD8] bg-surface text-[#3F4946]'}`
  return (
    <Sheet label={`Noter ${walk.name.toLowerCase()}`} onClose={onClose}>
      <div>
        <span className="text-[13px] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">
          {walk.name} · {formatHour(walk.time)}
          {walk.date !== today ? ' · hier' : ''}
        </span>
        <h2 className="mt-1 font-display text-[24px] font-extrabold">Combien de temps ?</h2>
      </div>
      <div role="radiogroup" aria-label="Durée de la sortie" className="grid grid-cols-3 gap-2.5">
        {DURATION_CHOICES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={pick === m} onClick={() => setPick(m)} className={choice(pick === m)}>
            {minutesText(m)}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={pick === 'autre'} onClick={() => setPick('autre')} className={choice(pick === 'autre')}>
          Autre
        </button>
      </div>
      {pick === 'autre' && (
        <label className="flex flex-col gap-1.5 text-[15px] font-bold">
          Durée en minutes
          <input type="number" inputMode="numeric" min={1} max={300} value={other} onChange={(e) => setOther(e.target.value)} autoFocus className="min-h-12 rounded-[14px] border-2 border-solid border-[#D5DBD8] px-3.5 text-[16px] font-normal" />
        </label>
      )}
      <p className="text-[14px] leading-snug text-[#3F4946]">Sans tracé, le brouillard ne bouge pas. Pour le lever, lancez la marche sur la Watch ou importez-la.</p>
      <button type="button" onClick={save} disabled={!valid} className="btn btn-main min-h-[56px]">
        C’est noté
      </button>
    </Sheet>
  )
}

/**
 * « Ses sorties du jour » (T-035), en haut de l’accueil : les 3 sorties avec leur durée (faite ou conseillée), le temps
 * de marche du jour, un conseil, et l’aperçu de ses tracés qui ouvre la carte. Une sortie faite sans balade se note en
 * 2 touchers : « + Je l’ai faite », puis la durée (R-044). Le matin, les sorties d’hier restent notables.
 */
export function WalkDayCard({ plan, times, yesterday }: { plan: WalkDayPlan; times: WalkTimes; /** Le matin : les sorties d’hier pas faites. */ yesterday?: { date: ISODate; slots: WalkSlot[] } }) {
  const { entries } = useData()
  const today = useToday()
  const walks = useMemo(() => walkItems(entries), [entries])
  const tracks = useMemo(() => trackThumb(walks.map((w) => w.route.points), THUMB), [walks])
  const done = plan.slots.filter((s) => s.state === 'faite').length
  const progress = Math.min(1, plan.daily ? plan.walked / plan.daily : done / 3)
  const [noting, setNoting] = useState<ToNote>()
  const note = (date: ISODate, slot: WalkSlot, advised?: number) => setNoting({ date, slot, time: times[slot], name: walkName(times[slot]).replace(/^la s/, 'S'), ...(advised ? { advised } : {}) })

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
      {yesterday && yesterday.slots.length > 0 && (
        <div className="flex flex-col">
          <h3 className="text-[13px] font-extrabold tracking-[0.6px] text-[#3F4946] uppercase">Hier</h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {yesterday.slots.map((slot) => {
              const name = walkName(times[slot]).replace(/^la s/, 'S')
              return (
                <li key={slot} className="grid min-h-[52px] grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 border-0 border-b border-solid border-[#EDF0EE] py-1">
                  <span className="text-[15px] font-extrabold text-muted">{formatHour(times[slot])}</span>
                  <span className="text-[15px] leading-tight text-[#3F4946]">{name}</span>
                  <NoteButton onClick={() => note(yesterday.date, slot)} label={`${name} d’hier : je l’ai faite`} />
                </li>
              )
            })}
          </ul>
          <h3 className="mt-2 text-[13px] font-extrabold tracking-[0.6px] text-[#3F4946] uppercase">Aujourd’hui</h3>
        </div>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {plan.slots.map((slot) => (
          <SlotRow key={slot.slot} slot={slot} onNote={() => note(today, slot.slot, slot.state === 'a-venir' ? slot.minutes : undefined)} />
        ))}
      </ul>
      <p className="text-[14px] leading-snug text-[#3F4946]">{plan.tip}</p>
      {/* App iOS (T-036) : une sortie reste à faire, on la lance d’ici ; le GPS de l’iPhone l’enregistre. */}
      {isNative() && plan.slots.some((s) => s.state === 'a-venir') && (
        <Link to="/balade-en-cours?depart=1" className="tap btn btn-main min-h-[56px]">
          Partir en balade
        </Link>
      )}
      <Link to={walks.length ? '/territoire' : '/importer'} className="tap btn btn-outline min-h-12 gap-2">
        <MapIcon size={20} />
        {walks.length ? 'Explorer la carte' : isNative() ? 'Importer un fichier GPX' : 'Importer mes balades'}
      </Link>
      {noting && <NoteSheet walk={noting} onClose={() => setNoting(undefined)} />}
    </section>
  )
}
