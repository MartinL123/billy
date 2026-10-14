import { useState } from 'react'
import { CheckIcon } from '../../components/Icons'
import { useToast } from '../../components/Toast'
import { SKILLS, stepShort, TERRITORIES } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { activeSkills, MAX_ACTIVE, skillHints, toggleActive } from '../../lib/active'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { BossIcon } from '../training/BossIcon'

/** « En cours » : le maître choisit lui-même jusqu'à 3 compétences. La quête du jour pioche dedans. */
export default function EnCours() {
  const { dog, events, bossProgress } = useData()
  const today = useToday()
  const back = useBack('/billy')
  const toast = useToast()
  const [chosen, setChosen] = useState(() => activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress))
  const [refused, setRefused] = useState(false)
  // Les peurs déclarées au questionnaire : ses réactions, ou les anciennes cases tant qu'il n'a pas été refait.
  const fears = dog.reactions ? dog.reactions.filter((r) => r.reaction === 'peur').map((r) => r.situation) : [...(dog.fears ?? []), dog.fearsOther ?? ''].filter(Boolean)
  const hints = skillHints(fears, dog.traits ?? [], events, today)

  const toggle = (id: string) => {
    const result = toggleActive(chosen, id)
    setChosen(result.chosen)
    setRefused(result.refused)
  }

  const save = () => {
    updateDog({ activeSkills: chosen })
    toast('Compétences en cours enregistrées')
    back()
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          Retour
        </button>
        <span className="text-lg font-bold">En cours</span>
        <div className="w-[92px]" />
      </header>

      <main className="flex flex-col gap-4 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+130px)]">
        <h1 className="font-display text-[26px] leading-tight font-extrabold">Sur quoi travailler en ce moment ?</h1>
        <p className="text-[15px] leading-snug text-[#3F4946]">
          Choisissez jusqu'à <strong>{MAX_ACTIVE} compétences</strong>. La mission du jour vous proposera leurs exercices, à tour de rôle. Les autres ne sont pas oubliées : elles reviennent de temps en temps en révision.
        </p>
        <p aria-live="polite" className="self-start rounded-full bg-primary-soft px-3.5 py-1.5 text-[15px] font-bold text-primary-dark">
          {chosen.length} choisie{chosen.length > 1 ? 's' : ''} sur {MAX_ACTIVE}
        </p>

        {TERRITORIES.map((territory) => (
          <section key={territory.tier} className="flex flex-col gap-2">
            <h2 className="mt-1 text-[13px] font-bold tracking-[0.6px] uppercase" style={{ color: territory.color }}>
              {territory.name}
            </h2>
            {SKILLS.filter((s) => s.tier === territory.tier).map((skill) => {
              const acquired = bossProgress[skill.id]?.level ?? 0
              const mastered = acquired >= MAX_LEVEL
              const on = chosen.includes(skill.id)
              const hint = hints[skill.id]
              const body = (
                <>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full" style={{ background: on ? territory.color : territory.soft, color: on ? '#FFFFFF' : territory.color }}>
                    <BossIcon bossId={skill.id} size={22} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[17px] leading-tight font-bold">{skill.name}</span>
                    <span className="text-sm leading-snug text-[#3F4946]">{mastered ? 'Maîtrisé · revu de temps en temps' : stepShort(skill.id, acquired + 1)}</span>
                    {hint && !mastered && <span className={`text-[13px] leading-snug font-semibold ${hint.kind === 'doux' ? 'text-milestone-dark' : 'text-primary'}`}>{hint.text}</span>}
                  </span>
                </>
              )
              if (mastered) {
                return (
                  <div key={skill.id} className="flex min-h-16 items-center gap-3 rounded-[18px] border-2 border-solid border-border bg-surface px-3.5 py-2.5">
                    {body}
                    <span className="shrink-0 rounded-lg bg-gold-soft px-2 py-1 text-[13px] font-bold text-[#5C4410]">Maîtrisé</span>
                  </div>
                )
              }
              return (
                <button
                  key={skill.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(skill.id)}
                  className="flex min-h-16 items-center gap-3 rounded-[18px] border-2 border-solid px-3.5 py-2.5 text-left text-text"
                  style={{ borderColor: on ? territory.color : '#D3D9D6', background: on ? territory.soft : '#FFFFFF' }}
                >
                  {body}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border-2 border-solid text-white" style={{ borderColor: on ? territory.color : '#9AA39F', background: on ? territory.color : '#FFFFFF' }}>
                    {on && <CheckIcon size={18} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </section>
        ))}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto flex max-w-[430px] flex-col gap-2 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {refused && (
            <p role="alert" className="rounded-[14px] bg-info-soft px-3.5 py-2.5 text-[15px] leading-snug text-[#1D3F73]">
              Pour en choisir une autre, décochez-en d'abord une. Ce qu'il a déjà appris reste acquis.
            </p>
          )}
          <button type="button" onClick={save} className="btn btn-main min-h-[60px] w-full text-[19px]">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
