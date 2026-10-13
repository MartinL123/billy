import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InfoIcon, TargetIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { Fab } from '../../components/TabBar'
import { CHEW_RULES, CHEWS, GAMES, type Idea } from '../../content/extras'
import { useData } from '../../firebase/store'
import { Illustration } from './Illustration'
import { Radar } from './Radar'
import { Tree } from './Tree'
import { useDressage } from './useDressage'

function Ideas({ title, ideas, note }: { title: string; ideas: Idea[]; note?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[19px] font-bold">{title}</h2>
      <div className="card overflow-hidden">
        {ideas.map((idea, i) => (
          <div key={idea.id}>
            <button
              type="button"
              aria-expanded={open === idea.id}
              onClick={() => setOpen(open === idea.id ? null : idea.id)}
              className={`flex min-h-[56px] w-full flex-col justify-center border-0 bg-transparent px-4 py-2 text-left ${i ? 'border-t border-solid border-divider' : ''}`}
            >
              <span className="text-base font-semibold text-text">{idea.name}</span>
              <span className="text-[13px] text-muted">{idea.detail}</span>
            </button>
            {open === idea.id && (
              <div className="flex flex-col gap-3 bg-bg p-4">
                <Illustration scene={idea.scene} className="h-[110px] bg-surface" />
                <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-snug">
                  {idea.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
      {note && <p className="text-[13px] leading-snug text-muted">{note}</p>}
    </section>
  )
}

export default function Training() {
  const { dog, bossProgress } = useData()
  const navigate = useNavigate()
  const dressage = useDressage()
  const [adding, setAdding] = useState(false)
  const ratio = Math.min(1, dressage.level.current / dressage.level.needed)
  const go = (to: string) => {
    setAdding(false)
    navigate(to)
  }
  const rowClass = 'flex w-full items-center gap-3.5 rounded-[20px] border-0 bg-bg px-4 py-3 text-left text-text'

  return (
    <div className="flex flex-col gap-6 px-5">
      <PageHeader title="Dressage" />

      <section aria-label={`Rang et niveau de ${dog.name}`} className="flex flex-col gap-2.5 rounded-3xl bg-primary p-5 text-white shadow-card">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-[12px] font-bold tracking-[0.6px] uppercase opacity-85">Rang</span>
            <span className="font-display text-[28px] leading-tight font-bold">{dressage.rank}</span>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[15px] font-bold text-primary-dark">Niveau {dressage.level.level}</span>
        </div>
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
        <div className="flex justify-between text-[13px] opacity-90">
          <span>
            {dressage.level.current} / {dressage.level.needed} XP
          </span>
          <span>
            {dressage.levelsAcquired} palier{dressage.levelsAcquired > 1 ? 's' : ''} acquis
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

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Ses forces</h2>
        <div className="card rounded-3xl p-4">
          <Radar now={dressage.statsNow} before={dressage.statsBefore} />
        </div>
      </section>

      <Ideas title="Idées de jeux" ideas={GAMES} />
      <Ideas title="À mâcher" ideas={CHEWS} note={CHEW_RULES} />

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
        </Sheet>
      )}
    </div>
  )
}
