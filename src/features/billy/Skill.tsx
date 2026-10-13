import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckIcon, NoteIcon, TargetIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet } from '../../components/Sheet'
import { SKILLS, stepPhrase } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { useData } from '../../firebase/store'
import { declarePreApp } from '../../firebase/training'
import { EMPTY_PROGRESS } from '../../lib/bossProgress'
import { formatLong } from '../../lib/dates'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { BossIcon } from '../training/BossIcon'
import { StepSuccess } from '../training/Celebration'
import { StepDots } from './StepDots'

/** Fiche d'une compétence : les 5 étapes en chemin vertical, sans numéro. */
export default function Skill() {
  const { id } = useParams()
  const { dog, bossProgress, xpLog } = useData()
  const today = useToday()
  const back = useBack('/billy')
  const [confirming, setConfirming] = useState(false)
  const [celebrate, setCelebrate] = useState<number | null>(null)

  const skill = SKILLS.find((s) => s.id === id)
  if (!skill) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[17px] text-muted">Cette compétence n'existe pas.</p>
        <button type="button" onClick={back} className="btn btn-main">
          Retour
        </button>
      </main>
    )
  }

  const stored = bossProgress[skill.id]
  const progress = stored ?? EMPTY_PROGRESS
  const current = progress.level + 1
  const dateOf = (step: number) => (progress.preApp?.includes(step) ? undefined : xpLog.find((e) => e.id === `palier-${skill.id}-${step}`)?.date)

  const alreadyKnows = () => {
    setConfirming(false)
    const gained = declarePreApp(skill.id, stored, current, today)
    if (gained.length === 0) return
    setCelebrate(current)
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          Retour
        </button>
      </header>

      <main className="flex flex-col gap-6 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+170px)]">
        <div className="flex items-center gap-3.5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <BossIcon bossId={skill.id} size={32} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-display text-[28px] leading-tight font-bold">{skill.name}</h1>
            <p className="text-[17px] leading-snug text-muted">{stepPhrase(skill.id, MAX_LEVEL)}</p>
          </div>
        </div>
        <Pending show={Boolean(stored?.pending)} />

        <ol className="m-0 flex list-none flex-col p-0">
          {[1, 2, 3, 4, 5].map((step) => {
            const acquired = step <= progress.level
            const isCurrent = step === current
            const date = dateOf(step)
            return (
              <li key={step} className="flex gap-3.5">
                <span className="flex flex-col items-center">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-solid ${
                      acquired ? 'border-gold bg-gold text-gold-dark' : isCurrent ? 'border-milestone bg-surface' : 'border-border bg-surface'
                    }`}
                  >
                    {acquired ? <CheckIcon size={20} strokeWidth={3} /> : isCurrent ? <span className="size-3 rounded-full bg-milestone" /> : null}
                  </span>
                  {step < MAX_LEVEL && <span className={`w-0.5 flex-1 ${acquired ? 'bg-gold' : 'bg-border'}`} />}
                </span>
                <div className={`mb-4 flex min-w-0 flex-1 flex-col gap-2 ${isCurrent ? 'card border-2 border-solid border-milestone p-4' : 'pt-1.5'}`}>
                  {isCurrent && <span className="text-[13px] font-bold tracking-[0.6px] text-milestone-dark uppercase">Prochaine étape</span>}
                  <span className={`text-[17px] leading-snug ${acquired || isCurrent ? 'font-semibold' : 'text-[#8C9692]'}`}>{stepPhrase(skill.id, step)}</span>
                  {acquired && <span className="text-sm text-muted">{date ? `Acquis le ${formatLong(date)}` : "Acquis avant l'app"}</span>}
                  {isCurrent && (
                    <>
                      <StepDots progress={progress} />
                      <button type="button" onClick={() => setConfirming(true)} className="btn btn-outline">
                        {dog.name} sait déjà faire ça
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        {progress.level >= MAX_LEVEL && <p className="rounded-[20px] bg-gold-soft px-4 py-3 text-[17px] font-semibold text-[#5C4410]">{dog.name} sait tout faire ici. Bravo à vous deux !</p>}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto flex max-w-[430px] flex-col gap-2.5 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <Link to={`/raconter?competences=${skill.id}`} className="btn btn-main min-h-[60px] text-[19px]">
            <NoteIcon size={24} />
            Raconter un moment
          </Link>
          <Link to={`/exercice?competence=${skill.id}`} className="btn btn-outline min-h-[52px]">
            <TargetIcon size={22} />
            Faire un exercice
          </Link>
        </div>
      </div>

      {confirming && (
        <ConfirmSheet
          title={`${dog.name} sait déjà faire ça ?`}
          message={`« ${stepPhrase(skill.id, current)} » sera notée comme acquise avant l'app.`}
          confirmLabel="Oui, il sait le faire"
          tone="primary"
          onCancel={() => setConfirming(false)}
          onConfirm={alreadyKnows}
        />
      )}
      {celebrate !== null && <StepSuccess dogName={dog.name} bossId={skill.id} level={celebrate} inCarnet={false} onClose={() => setCelebrate(null)} />}
    </div>
  )
}
