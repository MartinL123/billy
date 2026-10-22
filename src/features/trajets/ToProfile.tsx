import { updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { deriveTraits, reactionsFromFears } from '../../lib/questionnaire'
import { useToday } from '../../lib/useToday'
import { hasReaction, type momentReaction } from '../../lib/route'
import { place } from '../../lib/garden'

/** « A eu peur » / « A grogné » : l’ajouter à « Comment il réagit », seulement si on le choisit. */
export function ToProfile({ reaction }: { reaction: ReturnType<typeof momentReaction> }) {
  const { dog } = useData()
  const today = useToday()
  if (!reaction) return null
  const current = dog.reactions ?? reactionsFromFears(dog.fears ?? [])
  if (hasReaction(current, reaction)) return <span className="mt-1 text-[0.8824rem] font-semibold text-primary">✓ Dans « {place('Comment il réagit')} »</span>
  const add = () => {
    const reactions = [...current, reaction]
    updateDog({ reactions, traits: deriveTraits(dog.traits ?? [], reactions, dog.homeMood, dog.birthDate, today) })
  }
  return (
    <button type="button" onClick={add} className="btn-text mt-1 -ml-1 self-start text-left">
      Ajouter à « {place('Comment il réagit')} »
    </button>
  )
}
