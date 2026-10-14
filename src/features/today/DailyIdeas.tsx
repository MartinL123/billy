import { useState } from 'react'
import { ChevronRightIcon } from '../../components/Icons'
import { CHEW_RULES, chewsFor, GAMES, ideaOfTheDay, type Idea } from '../../content/extras'
import { useData } from '../../firebase/store'
import { dayNumber, type ISODate } from '../../lib/dates'
import { Illustration } from '../training/Illustration'
import { place } from '../../lib/garden'

/** Occupation du jour : une idée de jeu et une idée à mâcher, renouvelées chaque jour. Rien à enregistrer. */
export function DailyIdeas({ today }: { today: ISODate }) {
  const { dog } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const day = dayNumber(today)
  // Une allergie notée au questionnaire retire les idées qui la contiennent.
  const chews = chewsFor(dog.allergies)
  const ideas: { kind: string; idea: Idea }[] = [
    { kind: 'Jeu', idea: ideaOfTheDay(GAMES, day) },
    ...(chews.length ? [{ kind: 'À mâcher', idea: ideaOfTheDay(chews, day, 2) }] : []),
  ]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[19px] font-bold">Occupation du jour</h2>
      <div className="card overflow-hidden">
        {ideas.map(({ kind, idea }, i) => (
          <div key={idea.id}>
            <button
              type="button"
              aria-expanded={open === idea.id}
              onClick={() => setOpen(open === idea.id ? null : idea.id)}
              className={`flex min-h-[64px] w-full items-center gap-3 border-0 bg-transparent px-4 py-2.5 text-left ${i ? 'border-t border-solid border-divider' : ''}`}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-bold tracking-[0.5px] text-muted uppercase">{kind}</span>
                <span className="text-[17px] font-semibold text-text">{idea.name}</span>
                <span className="text-sm text-muted">{idea.detail}</span>
              </span>
              <ChevronRightIcon size={20} className={`shrink-0 text-[#8C9692] transition-transform ${open === idea.id ? 'rotate-90' : ''}`} />
            </button>
            {open === idea.id && (
              <div className="flex flex-col gap-3 bg-bg p-4">
                <Illustration scene={idea.scene} className="h-[110px] bg-surface" />
                <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-snug">
                  {idea.steps.map((step) => (
                    <li key={step}>{place(step)}</li>
                  ))}
                </ol>
                {kind === 'À mâcher' && <p className="text-[13px] leading-snug text-muted">{CHEW_RULES}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
