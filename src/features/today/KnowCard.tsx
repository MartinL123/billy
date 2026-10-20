import { Link } from 'react-router-dom'
import { BoneIcon } from '../../components/BoneIcon'
import { useData } from '../../firebase/store'
import { BONES } from '../../lib/bones'
import { place } from '../../lib/garden'
import { essentialsDone, nextPart, partComplete, PARTS, profilePartsEarnBones } from '../../lib/questionnaire'

/**
 * « Faisons connaissance » (V5, T-050), tant que le questionnaire n’est pas fini : la prochaine partie, 5 petits points
 * (sans chiffre) et « Répondre ». Remplace la carte « Compléter son profil ».
 */
export function KnowCard() {
  const { dog } = useData()
  const part = nextPart(dog.questionnaire)
  const starting = !essentialsDone(dog.questionnaire)
  const to = starting || !part ? '/questionnaire' : `/questionnaire?partie=${part.part}`
  const done = PARTS.map((_, i) => partComplete(dog.questionnaire, i + 1))
  const count = done.filter(Boolean).length
  return (
    <section aria-label="Faisons connaissance" className="card flex flex-col gap-2.5 rounded-[20px] p-[18px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-extrabold tracking-[0.6px] text-primary uppercase">Faisons connaissance · 2 min</span>
        {profilePartsEarnBones(dog.questionnaire) && !starting && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-[13px] font-extrabold text-gold-dark">
            <BoneIcon size={16} />+{BONES.profilePart} os
          </span>
        )}
      </div>
      <h2 className="font-display text-[20px] leading-tight font-extrabold">{starting ? 'Les questions du départ' : place(PARTS[(part?.part ?? 1) - 1]!)}</h2>
      <p className="text-[15px] leading-snug text-[#3F4946]">{part ? `${part.remaining} petite${part.remaining > 1 ? 's' : ''} question${part.remaining > 1 ? 's' : ''}. Ses missions seront choisies pour ${dog.name}.` : 'Quelques questions pour finir.'}</p>
      <div className="flex items-center gap-3">
        <span role="img" aria-label={`${count} partie${count > 1 ? 's' : ''} sur ${PARTS.length} faite${count > 1 ? 's' : ''}`} className="flex gap-1.5">
          {done.map((ok, i) => (
            <span key={i} className={`size-2.5 rounded-full ${ok ? 'bg-primary' : 'bg-[#DFE4E1]'}`} />
          ))}
        </span>
        <Link to={to} className="tap ml-auto flex min-h-11 items-center rounded-full border-2 border-solid border-primary px-[18px] text-[16px] font-bold text-primary no-underline">
          Répondre
        </Link>
      </div>
    </section>
  )
}
