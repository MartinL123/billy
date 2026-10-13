import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InfoIcon, TargetIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { Fab } from '../../components/TabBar'
import { BOSSES, MAX_LEVEL } from '../../content/training'
import { useData } from '../../firebase/store'
import { declareRest } from '../../firebase/training'
import { useToast } from '../../components/Toast'
import { weekOf } from '../../lib/rhythm'
import { useToday } from '../../lib/useToday'
import { restXp } from '../../lib/xp'
import { Radar } from './Radar'
import { SessionAdviceCard } from './SessionAdviceCard'
import { Tree } from './Tree'
import { useDressage } from './useDressage'
import { Firsts, Quests, Rhythm } from './Week'

export default function Training() {
  const { dog, bossProgress, xpLog } = useData()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()
  const dressage = useDressage()
  const [adding, setAdding] = useState(false)
  const ratio = Math.min(1, dressage.level.current / dressage.level.needed)
  const go = (to: string) => {
    setAdding(false)
    navigate(to)
  }
  const restedToday = xpLog.some((e) => e.id === `repos-${today}`)
  const rest = (sniff: boolean) => {
    const xp = restXp(xpLog, weekOf(today))
    const { undo } = declareRest(today, sniff, xp)
    setAdding(false)
    toast(`${sniff ? 'Balade reniflage' : 'Jour de repos'} noté${xp ? ` · +${xp} XP` : ''}`, { label: 'Annuler', run: undo })
  }
  const rowClass = 'flex w-full items-center gap-3.5 rounded-[20px] border-0 bg-bg px-4 py-3 text-left text-text'

  return (
    <div className="flex flex-col gap-6 px-5">
      <PageHeader title="Dressage" />

      <SessionAdviceCard />

      <section aria-label={`Rang et niveau de ${dog.name}`} className="flex flex-col rounded-3xl bg-primary text-white shadow-card">
        <div className="flex flex-col gap-0.5 px-5 pt-5 pb-4">
          <span className="text-[12px] font-bold tracking-[0.6px] uppercase opacity-85">Rang</span>
          <span className="font-display text-[28px] leading-tight font-bold">{dressage.rank}</span>
          <span className="text-[15px] opacity-90">
            {dressage.levelsAcquired} palier{dressage.levelsAcquired > 1 ? 's' : ''} sur {BOSSES.length * MAX_LEVEL}
            {dressage.stars > 0 ? ` · ${dressage.stars} étoile${dressage.stars > 1 ? 's' : ''}` : ''}
          </span>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/20 px-5 pt-4 pb-5">
          <span className="text-[17px] font-bold">Niveau {dressage.level.level}</span>
          <div
            role="progressbar"
            aria-label={`Expérience vers le niveau ${dressage.level.level + 1}`}
            aria-valuemin={0}
            aria-valuemax={dressage.level.needed}
            aria-valuenow={dressage.level.current}
            className="h-3 overflow-hidden rounded-full bg-white/25"
          >
            <div className="h-full rounded-full bg-[#F4C27A] transition-[width] duration-500" style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%` }} />
          </div>
          <span className="text-[13px] opacity-90">
            {dressage.level.current} / {dressage.level.needed} XP vers le niveau {dressage.level.level + 1}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Les 10 boss</h2>
        <div className="card rounded-3xl px-2 py-4">
          <Tree progress={bossProgress} weatherByBoss={dressage.weatherByBoss} featured={dressage.featured} />
        </div>
        <p className="text-[13px] leading-snug text-muted">Tous les boss sont ouverts. Un trait plein relie deux boss quand le premier facilite déjà le second ; en pointillé, il aidera plus tard.</p>
      </section>

      <Rhythm />

      <Quests />

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Ses forces</h2>
        <div className="card rounded-3xl p-4">
          <Radar now={dressage.statsNow} before={dressage.statsBefore} />
        </div>
      </section>

      <Firsts />

      <Fab label="Noter une séance ou une exposition" onClick={() => setAdding(true)} />
      {adding && (
        <Sheet label="Noter" onClose={() => setAdding(false)}>
          <h2 className="my-1 font-display text-2xl font-bold">Noter</h2>
          <button type="button" onClick={() => go('/seance')} className={rowClass}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-dark">
              <TargetIcon size={26} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[17px] font-bold">Séance</span>
              <span className="text-sm text-muted">5 essais sur un exercice</span>
            </span>
          </button>
          <button type="button" onClick={() => go('/exposition')} className={rowClass}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-milestone-soft text-milestone-dark">
              <InfoIcon size={26} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[17px] font-bold">Exposition</span>
              <span className="text-sm text-muted">Un déclencheur croisé, voulu ou subi</span>
            </span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={restedToday} onClick={() => rest(false)} className="min-h-[56px] rounded-[20px] border-0 bg-bg px-3 text-base font-bold text-text disabled:opacity-50">
              Jour de repos
            </button>
            <button type="button" disabled={restedToday} onClick={() => rest(true)} className="min-h-[56px] rounded-[20px] border-0 bg-bg px-3 text-base font-bold text-text disabled:opacity-50">
              Balade reniflage
            </button>
          </div>
          <p className="text-[13px] leading-snug text-muted">
            {restedToday ? 'Récupération déjà notée pour aujourd’hui.' : 'Après une frayeur, une journée calme fait partie de l’entraînement.'}
          </p>
        </Sheet>
      )}
    </div>
  )
}
