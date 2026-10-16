import { useEffect, useState } from 'react'
import { BoneIcon } from '../../components/BoneIcon'
import { CheckIcon } from '../../components/Icons'
import { useData } from '../../firebase/store'
import { markWalk, unmarkWalk } from '../../firebase/walks'
import { BONES } from '../../lib/bones'
import type { ISODate } from '../../lib/dates'
import { formatHour, timeToMinutes, WALK_SLOTS, walkState, walkTimes, type WalkSlot } from '../../lib/walks'

const nowHHMM = () => new Date().toTimeString().slice(0, 5)

/** Accueil : les 3 sorties du jour. Un tap = sortie faite. Une sortie dont l'heure est passée passe en orange. */
export function WalksCard({ today }: { today: ISODate }) {
  const { dog, walks } = useData()
  const times = walkTimes(dog.walkTimes)
  const done = walks.find((w) => w.date === today)?.done ?? {}
  const [now, setNow] = useState(nowHHMM())

  useEffect(() => {
    const timer = setInterval(() => setNow(nowHHMM()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const count = WALK_SLOTS.filter((s) => done[s.id]).length
  const toggle = (slot: WalkSlot) => (done[slot] ? unmarkWalk(today, slot) : markWalk(today, slot, nowHHMM()))

  return (
    <section className="card flex flex-col gap-3 rounded-[22px] p-4" aria-labelledby="sorties-titre">
      <div className="flex items-center justify-between gap-3">
        <h2 id="sorties-titre" className="font-display text-xl font-extrabold">
          Sorties du jour
        </h2>
        <span className="text-[15px] font-bold text-muted">{count}/3</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {WALK_SLOTS.map((slot) => {
          const state = walkState(times[slot.id], done[slot.id], timeToMinutes(now))
          const styles = {
            fait: 'border-primary bg-primary text-white',
            'a-faire': 'border-milestone bg-milestone-soft text-milestone-dark',
            'plus-tard': 'border-border bg-surface text-text',
          }[state]
          const detail = state === 'fait' ? `Fait à ${formatHour(done[slot.id]!)}` : state === 'a-faire' ? 'À faire' : formatHour(times[slot.id])
          return (
            <button
              key={slot.id}
              type="button"
              aria-pressed={state === 'fait'}
              aria-label={`${slot.label}, ${detail}. ${state === 'fait' ? 'Toucher pour décocher' : 'Toucher quand la sortie est faite'}`}
              onClick={() => toggle(slot.id)}
              className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-solid px-1 py-2 ${styles}`}
            >
              <span className="flex items-center gap-1 text-[17px] font-bold">
                {state === 'fait' && <CheckIcon size={18} />}
                {slot.label}
              </span>
              <span className="text-[13px] font-semibold">{detail}</span>
            </button>
          )
        })}
      </div>
      <p className="flex items-center gap-1 text-sm text-muted">
        Hors du jardin, même 15 min · +{BONES.walk}
        <BoneIcon size={14} />
        <span className="sr-only">os</span> par sortie
      </p>
    </section>
  )
}
