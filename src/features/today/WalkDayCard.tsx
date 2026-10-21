import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BonesGained } from '../../components/BoneIcon'
import { CheckIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { noteWalk } from '../../firebase/imports'
import { useData } from '../../firebase/store'
import { useReadOnly } from '../../firebase/viewer'
import type { ISODate } from '../../lib/dates'
import { DURATION_CHOICES, preselectedDuration, type WalkDayPlan } from '../../lib/walkDay'
import { walkItems } from '../../lib/walkList'
import { formatHour, WALK_SLOTS, type WalkSlot, type WalkTimes } from '../../lib/walks'
import { useToday } from '../../lib/useToday'
import { isNative } from '../../native'
import { haptic } from '../../native/flair'

/** Une sortie à noter (R-044) : d’aujourd’hui, ou d’hier le matin. */
export interface ToNote {
  date: ISODate
  slot: WalkSlot
  time: string
  name: string
  advised?: number
}

const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}` : `${m}\u00a0min`)

/** « Combien de temps ? » : 10, 15, 25, 40 min, 1 h ou Autre ; la durée conseillée présélectionnée. */
export function NoteSheet({ walk, onClose }: { walk: ToNote; onClose: () => void }) {
  const { bones } = useData()
  const today = useToday()
  const toast = useToast()
  const [pick, setPick] = useState<number | 'autre'>(preselectedDuration(walk.advised))
  const [other, setOther] = useState('')
  const [error, setError] = useState(false)
  const minutes = pick === 'autre' ? Math.round(Number(other)) : pick
  const valid = Number.isFinite(minutes) && minutes >= 1 && minutes <= 300

  const save = () => {
    if (!valid) return setError(true)
    haptic('success')
    const gains = noteWalk({ date: walk.date, slot: walk.slot, minutes, time: walk.time }, bones, today)
    const label = `${walk.name} notée`
    const amount = gains.reduce((sum, g) => sum + g.amount, 0)
    toast(amount ? <BonesGained label={label} amount={amount} /> : label, undefined, amount ? { bones: true } : undefined)
    onClose()
  }

  const choice = (on: boolean) => `tap min-h-[52px] rounded-[16px] border-2 border-solid text-[1rem] font-extrabold ${on ? 'border-primary bg-primary-soft text-primary' : 'border-line-strong bg-surface text-[#3F4946]'}`
  return (
    <Sheet label={`Noter ${walk.name.toLowerCase()}`} onClose={onClose}>
      <div>
        <span className="text-[0.7647rem] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">
          {walk.name} · {formatHour(walk.time)}
          {walk.date !== today ? ' · hier' : ''}
        </span>
        <h2 className="mt-1 font-display text-[1.4118rem] font-extrabold">Combien de temps ?</h2>
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
        <label className="flex flex-col gap-1.5 text-[0.8824rem] font-bold">
          Durée en minutes
          <input type="number" inputMode="numeric" min={1} max={300} value={other} onChange={(e) => {
              setOther(e.target.value)
              setError(false)
            }} autoFocus aria-invalid={error || undefined} aria-describedby={error ? 'duree-err' : undefined} className={`min-h-12 rounded-[14px] border-2 border-solid px-3.5 text-[1rem] font-normal ${error ? 'border-danger' : 'border-line-strong'}`} />
        </label>
      )}
      {pick === 'autre' && error && (
        <p id="duree-err" role="alert" className="text-sm font-medium text-danger">
          Entrez une durée entre 1 et 300{'\u00a0'}min
        </p>
      )}
      <p className="text-[0.8235rem] leading-snug text-[#3F4946]">Sans tracé, le brouillard ne bouge pas. Pour le lever, lancez la marche sur la Watch ou importez-la.</p>
      <button type="button" onClick={save} className="btn btn-main min-h-[56px]">
        C’est noté
      </button>
    </Sheet>
  )
}

/**
 * « Ses sorties du jour » (V5, T-050) : 3 pastilles côte à côte. Faite : fond vert clair, coche, durée. À faire :
 * contour pointillé, « + Noter » ouvre « Combien de temps ? ». Dessous, une phrase : ce qui reste et la durée
 * conseillée. Plus de barre ni de total.
 */
export function WalkDayCard({ plan, times, yesterday, sentence, onNote, showStart, pending }: {
  plan: WalkDayPlan
  times: WalkTimes
  /** Le matin : les sorties d’hier pas faites, encore notables (R-044). */
  yesterday?: { date: ISODate; slots: WalkSlot[] }
  sentence: string
  onNote: (date: ISODate, slot: WalkSlot) => void
  /** Bouton contour « Partir en balade » (app iOS), seulement si la carte du moment n’est pas déjà une sortie. */
  showStart: boolean
  /** Hors ligne : les sorties notées attendent d’être envoyées. */
  pending: boolean
}) {
  const { entries } = useData()
  const today = useToday()
  const noWalkYet = useMemo(() => walkItems(entries).length === 0, [entries])
  // Visiteur (T-048) : il voit les sorties, sans les noter.
  const readOnly = useReadOnly()
  const label = (slot: WalkSlot) => WALK_SLOTS.find((s) => s.id === slot)!.label

  return (
    <section aria-label="Ses sorties du jour" className="card flex flex-col gap-3 rounded-[24px] p-4">
      <h2 className="font-display text-[1.1765rem] leading-tight font-extrabold">Ses sorties du jour</h2>
      {!readOnly && yesterday && yesterday.slots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.7647rem] font-extrabold tracking-[0.6px] text-[#3F4946] uppercase">Hier</span>
          {yesterday.slots.map((slot) => (
            <button key={slot} type="button" onClick={() => onNote(yesterday.date, slot)} aria-label={`Noter la sortie ${label(slot).toLowerCase()} d’hier`} className="tap min-h-11 rounded-full border-2 border-dashed border-[#6E8C83] bg-surface px-3.5 text-[0.8824rem] font-bold text-primary">
              + {label(slot)}
            </button>
          ))}
        </div>
      )}
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {plan.slots.map((slot) => (
          <li key={slot.slot}>
            {slot.state === 'faite' ? (
              <span className="anim-pop flex min-h-[84px] flex-col items-center justify-center gap-0.5 rounded-[16px] bg-primary-soft text-center text-primary-dark">
                <CheckIcon size={22} />
                <span className="text-[0.9412rem] font-extrabold">{label(slot.slot)}</span>
                <span className="text-[0.8235rem] font-semibold">{slot.minutes ? minutesText(slot.minutes) : 'Faite'}</span>
                {pending && <span className="text-[0.7059rem] text-[#3F4946]">en attente</span>}
              </span>
            ) : readOnly ? (
              <span className="flex min-h-[84px] flex-col items-center justify-center gap-0.5 rounded-[16px] border-2 border-dashed border-[#6E8C83] text-text">
                <span className="text-[0.8235rem] font-semibold text-[#3F4946]">{formatHour(times[slot.slot])}</span>
                <span className="text-[0.9412rem] font-extrabold">{label(slot.slot)}</span>
              </span>
            ) : (
              <button type="button" onClick={() => onNote(today, slot.slot)} aria-label={`Noter la sortie ${label(slot.slot).toLowerCase()}, ${slot.hour}`} className="tap flex min-h-[84px] w-full flex-col items-center justify-center gap-0.5 rounded-[16px] border-2 border-dashed border-[#6E8C83] bg-surface p-0 text-text">
                <span className="text-[0.8235rem] font-semibold text-[#3F4946]">{formatHour(times[slot.slot])}</span>
                <span className="text-[0.9412rem] font-extrabold">{label(slot.slot)}</span>
                <span className="text-[0.8235rem] font-bold text-primary">+ Noter</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[0.8824rem] leading-snug text-[#3F4946]">{sentence}</p>
      {/* App iOS (T-036) : partir d’ici, sauf si la carte du moment le propose déjà. */}
      {!readOnly && isNative() && showStart && plan.slots.some((s) => s.state !== 'faite') && (
        <Link to="/balade-en-cours?depart=1" className="tap btn btn-outline min-h-[50px] gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
          </svg>
          Partir en balade
        </Link>
      )}
      {/* Un compte sans aucune balade : l’import reste proposé ici (sinon, il est dans le panneau de Balades). */}
      {!readOnly && noWalkYet && (
        <Link to="/importer" className="tap btn btn-quiet min-h-11 self-center px-4 text-[0.8824rem] text-primary">
          {isNative() ? 'Importer un fichier GPX' : 'Importer mes balades'}
        </Link>
      )}
    </section>
  )
}
