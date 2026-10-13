import { Link } from 'react-router-dom'
import { bossById } from '../../content/training'
import { useData } from '../../firebase/store'
import { recommendSession, sessionLink } from '../../lib/recommend'

/** Séance conseillée, choisie selon les boss conseillés pour le chien et la dernière séance. */
export function useSessionAdvice() {
  const { dog, sessions } = useData()
  return recommendSession(dog.traits ?? [], sessions)
}

export function SessionAdviceCard() {
  const advice = useSessionAdvice()
  if (!advice) return null
  const boss = bossById(advice.bossId)
  return (
    <section aria-label="Séance conseillée" className="card flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex flex-col gap-1">
        <span className="text-[12px] font-bold tracking-[0.6px] text-muted uppercase">Séance conseillée</span>
        <span className="font-display text-2xl leading-tight font-bold">{advice.exercise.name}</span>
        <span className="text-[15px] leading-snug text-muted">
          Pour {boss?.name} · N{advice.difficulty} : {advice.exercise.levels[advice.difficulty - 1]}
        </span>
      </div>
      <Link to={sessionLink(advice)} className="flex h-[54px] items-center justify-center rounded-full bg-primary text-[17px] font-bold text-white no-underline">
        Commencer
      </Link>
    </section>
  )
}
