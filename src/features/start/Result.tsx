import { useNavigate } from 'react-router-dom'
import { CheckIcon } from '../../components/Icons'
import { useToast } from '../../components/Toast'
import { SKILLS, stepPhrase, TERRITORIES } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { answerQuestion } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { declarePreApp, uncheckSteps } from '../../firebase/training'
import { canUncheck, EMPTY_PROGRESS, markPreApp } from '../../lib/bossProgress'
import { answerForSteps } from '../../lib/questionnaire'
import { useToday } from '../../lib/useToday'
import { stepsAcquired } from '../../lib/level'
import { Badge } from '../billy/Badge'

const plural = (n: number, word: string) => `${n} étape${n > 1 ? 's' : ''} ${word}${n > 1 ? 's' : ''}`

/**
 * Résultat du questionnaire : ce qu’il sait déjà faire, en cases à cocher rangées par étage.
 * On corrige avant de commencer : décocher emporte les étapes plus difficiles, cocher prend les plus faciles.
 * Seules les étapes déclarées « il savait déjà le faire » se décochent ; une étape validée dans l’app, jamais.
 */
export function Result() {
  const { dog, entries, bossProgress, xpLog } = useData()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()
  const steps = stepsAcquired(bossProgress)
  const answers = dog.questionnaire?.answers ?? {}

  const uncheck = (skillId: string, name: string, step: number) => {
    const current = bossProgress[skillId]
    if (!current) return
    const previous = answers[skillId]
    const { removed, undo } = uncheckSteps(skillId, current, step, xpLog)
    if (removed.length === 0) return
    answerQuestion(skillId, answerForSteps(step - 1))
    toast(`${name} : ${plural(removed.length, 'décochée')}.`, {
      label: 'Annuler',
      run: () => {
        undo()
        if (previous) answerQuestion(skillId, previous)
      },
    })
  }

  const check = (skillId: string, name: string, step: number) => {
    const current = bossProgress[skillId]
    const previous = answers[skillId]
    const gained = declarePreApp(skillId, current, step, today)
    if (gained.length === 0) return
    answerQuestion(skillId, answerForSteps(step))
    toast(`${name} : ${plural(gained.length, 'cochée')}.`, {
      label: 'Annuler',
      run: () => {
        uncheckSteps(skillId, markPreApp(current ?? EMPTY_PROGRESS, step).progress, gained[0]!, [])
        if (previous) answerQuestion(skillId, previous)
      },
    })
  }

  const souvenir = (dog.questionnaire?.souvenirs ?? []).map((id) => entries.find((e) => e.id === id)).filter((e) => e !== undefined).at(-1)
  const noteSouvenir = () => navigate('/noter?quand=autre&retour=questionnaire')

  return (
    <>
      <h1 className="font-display text-[1.6471rem] leading-tight font-extrabold" aria-live="polite">
        {dog.name} commence avec {steps} étape{steps > 1 ? 's' : ''} déjà acquise{steps > 1 ? 's' : ''}
      </h1>
      <p className="rounded-2xl bg-[#FFF8E6] px-3.5 py-3 text-[0.8824rem] leading-[1.45] text-gold-dark">
        <strong>Vérifiez avant de commencer.</strong> Touchez une étape pour la décocher si on s’est trompé, ou pour cocher la suivante. Décocher une étape décoche aussi les plus difficiles de la même compétence.
      </p>

      {TERRITORIES.map((territory) => (
        <section key={territory.tier} className="flex flex-col gap-3">
          <h2 className="mx-1 mt-2 text-[0.7647rem] font-extrabold tracking-[0.6px] uppercase" style={{ color: territory.color }}>
            {territory.name}
          </h2>
          {SKILLS.filter((s) => s.tier === territory.tier).map((skill) => {
            const progress = bossProgress[skill.id] ?? EMPTY_PROGRESS
            const steps = Array.from({ length: Math.min(MAX_LEVEL, progress.level + 1) }, (_, i) => i + 1)
            return (
              <div key={skill.id} role="group" aria-label={skill.name} className="flex flex-col rounded-[20px] border-0 border-l-[6px] border-solid bg-surface px-3.5 pt-3 pb-1" style={{ borderColor: territory.color }}>
                <div className="flex items-center gap-2.5 pb-2">
                  <Badge bossId={skill.id} acquired={progress.level} size={44} />
                  <h3 className="font-display text-lg font-extrabold">{skill.name}</h3>
                </div>
                {steps.map((step) => {
                  const acquired = step <= progress.level
                  const locked = acquired && !canUncheck(progress, step)
                  return (
                    <button
                      key={step}
                      type="button"
                      role="checkbox"
                      aria-checked={acquired}
                      aria-disabled={locked}
                      onClick={() => (locked ? toast('Cette étape a été validée dans l’app : elle reste acquise.') : acquired ? uncheck(skill.id, skill.name, step) : check(skill.id, skill.name, step))}
                      className="flex min-h-[52px] items-center gap-3 border-0 border-t border-solid border-[#EEF0EE] bg-transparent px-0 py-2 text-left text-text"
                    >
                      <span
                        className={`flex size-[30px] shrink-0 items-center justify-center rounded-[9px] text-white ${acquired ? '' : 'border-2 border-solid border-[#A9B3AF] bg-surface'} ${locked ? 'opacity-55' : ''}`}
                        style={acquired ? { background: territory.color } : undefined}
                      >
                        {acquired && <CheckIcon size={18} strokeWidth={3} />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={`text-[0.8824rem] leading-snug ${acquired ? 'font-semibold' : 'text-muted'}`}>{stepPhrase(skill.id, step)}</span>
                        {locked && <span className="text-[0.7647rem] text-muted">Validée dans l’app</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </section>
      ))}

      {souvenir ? (
        <div className="mt-1.5 flex items-center gap-3 rounded-[18px] bg-primary-soft px-3.5 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <CheckIcon size={20} strokeWidth={3} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[0.8824rem] font-bold text-primary-dark">Souvenir noté dans le Carnet</span>
            <span className="truncate text-[0.7647rem] text-primary">
              {souvenir.text ? `« ${souvenir.text.split('\n')[0]!.slice(0, 40)} »` : 'Sans texte'}
              {souvenir.photos.length > 0 ? ` · ${souvenir.photos.length} photo${souvenir.photos.length > 1 ? 's' : ''}` : ''}
            </span>
          </span>
          <button type="button" onClick={noteSouvenir} className="btn btn-outline min-h-12 shrink-0 bg-surface px-3.5 text-[0.8824rem]">
            Un autre
          </button>
        </div>
      ) : (
        <button type="button" onClick={noteSouvenir} className="btn btn-outline mt-1.5">
          Noter un souvenir de vos premières semaines
        </button>
      )}
    </>
  )
}
