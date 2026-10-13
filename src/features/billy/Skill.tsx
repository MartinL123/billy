import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { CheckIcon, ChevronLeftIcon, TargetIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet } from '../../components/Sheet'
import { SKILLS, stepPhrase, stepShort, territoryOf } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { useData } from '../../firebase/store'
import { declarePreApp } from '../../firebase/training'
import { EMPTY_PROGRESS, remaining } from '../../lib/bossProgress'
import { formatLong } from '../../lib/dates'
import { sessionMinutes } from '../../lib/training-plan'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { BossIcon } from '../training/BossIcon'
import { StepSuccess } from '../training/Celebration'

// Le sentier, dans un repère de 390 × 760 : l'étape 1 en bas, le trophée en haut.
const W = 390
const H = 760
const NODES = [
  { x: 110, y: 700 },
  { x: 280, y: 560 },
  { x: 110, y: 420 },
  { x: 280, y: 280 },
  { x: 195, y: 110 },
]
const SEGMENTS = ['M110 700 C 110 620, 280 640, 280 560', 'C 280 480, 110 500, 110 420', 'C 110 340, 280 360, 280 280', 'C 280 200, 195 190, 195 110']
const pct = (value: number, total: number) => `${(value / total) * 100}%`

function Trophy({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
    </svg>
  )
}

/** Un point du sentier : le cercle est centré sur (x, y), le texte part du côté libre. */
function Stop({ index, circle, radius, children }: { index: number; circle: ReactNode; radius: number; children: ReactNode }) {
  const { x, y } = NODES[index]!
  const top = index === MAX_LEVEL - 1
  const left = x < W / 2
  const label: CSSProperties = top
    ? { left: 12, right: 12, top: `calc(${pct(y, H)} + ${radius + 8}px)`, textAlign: 'center', alignItems: 'center' }
    : left
      ? { left: `calc(${pct(x, W)} + ${radius + 12}px)`, right: 10, top: pct(y, H), transform: 'translateY(-50%)' }
      : { right: `calc(${pct(W - x, W)} + ${radius + 12}px)`, left: 10, top: pct(y, H), transform: 'translateY(-50%)', textAlign: 'right', alignItems: 'flex-end' }
  return (
    <li className="contents">
      <span className="absolute flex items-center justify-center" style={{ left: pct(x, W), top: pct(y, H), width: radius * 2, height: radius * 2, transform: 'translate(-50%, -50%)' }}>
        {circle}
      </span>
      <span className="absolute flex flex-col gap-0.5" style={label}>
        {children}
      </span>
    </li>
  )
}

/** Le chemin d'une compétence : un sentier de jeu, Billy posé sur l'étape en cours, un trophée au bout. Aucun numéro. */
export default function Skill() {
  const { id } = useParams()
  const { dog, bossProgress, xpLog } = useData()
  const today = useToday()
  const back = useBack('/billy')
  const [confirming, setConfirming] = useState(false)
  const [celebrate, setCelebrate] = useState<number | null>(null)

  // On arrive sur l'étape en cours, là où Billy est posé.
  useEffect(() => {
    document.getElementById('etape-en-cours')?.scrollIntoView({ block: 'center' })
  }, [id])

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

  const territory = territoryOf(skill.id)
  const stored = bossProgress[skill.id]
  const progress = stored ?? EMPTY_PROGRESS
  const mastered = progress.level >= MAX_LEVEL
  const current = progress.level + 1
  const left = remaining(progress)
  const minutes = sessionMinutes(dog.birthDate, today)
  // Une étape cochée au questionnaire ou avec « sait déjà faire ça » n'a pas de date.
  const whenOf = (step: number) => {
    const date = progress.preApp?.includes(step) ? undefined : xpLog.find((e) => e.id === `palier-${skill.id}-${step}`)?.date
    return date ? formatLong(date).replace(/ \d{4}$/, '') : 'Il savait déjà le faire'
  }

  const alreadyKnows = () => {
    setConfirming(false)
    if (declarePreApp(skill.id, stored, current, today).length) setCelebrate(current)
  }

  const photo = (size: number) => (
    <span className="flex items-center justify-center overflow-hidden rounded-full bg-milestone-soft font-display text-3xl font-bold text-milestone-dark" style={{ width: size, height: size }}>
      {dog.photoThumbFileId ? <FileImage fileId={dog.photoThumbFileId} alt="" className="size-full" eager /> : dog.name.charAt(0).toUpperCase()}
    </span>
  )

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex flex-col gap-3 rounded-b-[28px] px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-[22px] text-white" style={{ background: territory.color }}>
        <button type="button" onClick={back} className="flex min-h-12 items-center gap-1.5 self-start rounded-full border-2 border-solid border-white/60 bg-transparent px-4 text-[17px] font-semibold text-white">
          <ChevronLeftIcon size={20} />
          {territory.name}
        </button>
        <div className="flex items-center gap-3.5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white" style={{ color: territory.color }}>
            <BossIcon bossId={skill.id} size={32} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-display text-[30px] leading-none font-extrabold">{skill.name}</h1>
            <span className="text-[15px] leading-snug text-white/90">Objectif : {stepPhrase(skill.id, MAX_LEVEL).replace(/^./, (c) => c.toLocaleLowerCase('fr'))}</span>
          </span>
        </div>
      </header>

      <main className="flex flex-col gap-3 px-0 pt-2 pb-[calc(env(safe-area-inset-bottom)+170px)]">
        <Pending show={Boolean(stored?.pending)} />
        <ol className="relative m-0 w-full list-none p-0" style={{ aspectRatio: `${W} / ${H}` }}>
          <li className="contents" aria-hidden="true">
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
              <path d={SEGMENTS.join(' ')} fill="none" stroke={territory.soft} strokeWidth="14" strokeLinecap="round" strokeDasharray="2 22" />
              {progress.level > 0 && <path d={SEGMENTS.slice(0, Math.min(progress.level, SEGMENTS.length)).join(' ')} fill="none" stroke={territory.color} strokeWidth="14" strokeLinecap="round" />}
            </svg>
          </li>
          {[1, 2, 3, 4, 5].map((step) => {
            const last = step === MAX_LEVEL
            const acquired = step <= progress.level
            if (step === current) {
              return (
                <Stop key={step} index={step - 1} radius={54} circle={<span className="flex size-[108px] items-center justify-center rounded-full border-[6px] border-solid border-gold bg-surface shadow-[0_6px_16px_rgba(242,181,68,0.45)]">{photo(84)}</span>}>
                  <span id="etape-en-cours" className="flex flex-col gap-1.5 rounded-[18px] bg-surface px-3.5 py-3 text-left shadow-[0_2px_8px_rgba(24,32,30,0.1)]">
                    <span className="text-xs font-extrabold tracking-[0.5px] uppercase" style={{ color: territory.color }}>
                      En ce moment
                    </span>
                    <span className="text-[15px] leading-snug font-bold">{stepPhrase(skill.id, step)}</span>
                    <span className="flex items-center gap-[5px] text-[13px] text-muted">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className={`size-[11px] rounded-full ${i < left.done ? 'bg-gold' : 'border-2 border-solid border-[#C9D1CD]'}`} />
                      ))}
                      <span className="ml-0.5">{left.done === 0 ? '3 jours à réussir' : `encore ${left.needed - left.done} fois`}</span>
                    </span>
                  </span>
                </Stop>
              )
            }
            if (last) {
              return (
                <Stop
                  key={step}
                  index={step - 1}
                  radius={46}
                  circle={
                    <span className={`flex size-[92px] items-center justify-center rounded-full border-4 text-[#8A6514] ${mastered ? 'border-solid border-gold bg-gold shadow-[0_6px_18px_rgba(242,181,68,0.6)]' : 'border-dashed border-[#E0B45A] bg-gold-soft'}`}>
                      <Trophy />
                    </span>
                  }
                >
                  <span className="rounded-lg bg-bg px-2 text-[15px] font-bold text-[#8A6514]">Maîtrisé : {stepShort(skill.id, step).replace(/^./, (c) => c.toLocaleLowerCase('fr'))}</span>
                  {mastered && <span className="text-[13px] text-muted">{whenOf(step)}</span>}
                </Stop>
              )
            }
            if (acquired) {
              return (
                <Stop
                  key={step}
                  index={step - 1}
                  radius={40}
                  circle={
                    <span className="flex size-20 items-center justify-center rounded-full border-[5px] border-solid border-white text-white shadow-[0_3px_8px_rgba(0,0,0,0.15)]" style={{ background: territory.color }}>
                      <CheckIcon size={32} strokeWidth={3} />
                    </span>
                  }
                >
                  <span className="text-[15px] leading-snug font-bold">{stepShort(skill.id, step)}</span>
                  <span className="text-[13px] text-muted">{whenOf(step)}</span>
                </Stop>
              )
            }
            return (
              <Stop key={step} index={step - 1} radius={36} circle={<span className="size-[72px] rounded-full border-4 border-dashed bg-surface" style={{ borderColor: territory.soft === '#DCEBE6' ? '#9CC5BA' : territory.soft === '#E3EAF8' ? '#9DB3DE' : '#E6B08A' }} />}>
                <span className="text-[15px] leading-snug font-semibold text-[#3F4946]">{stepShort(skill.id, step)}</span>
              </Stop>
            )
          })}
        </ol>

        <div className="flex flex-col gap-3 px-5">
          {mastered ? (
            <p className="rounded-[20px] bg-gold-soft px-4 py-3 text-[17px] leading-snug font-semibold text-[#5C4410]">À entretenir : elle revient de temps en temps dans la quête du jour.</p>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="btn btn-outline">
              {dog.name} sait déjà faire ça
            </button>
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto flex max-w-[430px] flex-col gap-2 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <Link to={`/exercice?competence=${skill.id}`} className="btn btn-main min-h-[58px] text-[18px]">
            <TargetIcon size={22} />
            S'entraîner · {minutes} min
          </Link>
          <Link to={`/noter?depuis=competence&competences=${skill.id}`} className="flex min-h-12 items-center justify-center rounded-full border-2 border-solid text-[17px] font-bold no-underline" style={{ borderColor: territory.color, color: territory.color }}>
            Déjà fait aujourd'hui ? Le noter
          </Link>
        </div>
      </div>

      {confirming && (
        <ConfirmSheet
          title={`${dog.name} sait déjà faire ça ?`}
          message={`« ${stepPhrase(skill.id, current)} » sera notée comme acquise : il savait déjà le faire.`}
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
