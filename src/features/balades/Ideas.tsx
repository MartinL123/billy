import { useMemo, useState } from 'react'
import { ChevronLeftIcon } from '../../components/Icons'
import { useData } from '../../firebase/store'
import { directionsUrl, KIND, metersLabel, type Idea } from '../../lib/ideas'
import { useBack } from '../../lib/useBack'
import { useIdeas } from './useIdeas'

type Filter = 'tout' | 'jamais' | 'vue' | 'plage' | 'parc' | 'eau'

/** Une idée : icône, nom, type · distance, raison, état, « Y aller » (Plans, à pied). */
export function IdeaCard({ idea }: { idea: Idea }) {
  const info = KIND[idea.kind]
  return (
    <article className="card flex flex-col gap-2 p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[22px]">
          {info.icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] leading-snug font-bold">{idea.name}</span>
          <span className="text-[15px] text-muted">
            {info.label} · {metersLabel(idea.meters)}
          </span>
        </span>
      </div>
      <p className="text-[15px] leading-snug text-[#3F4946]">{idea.reason}</p>
      {idea.dogsBanned && <p className="text-[15px] font-semibold text-danger">Chiens interdits, selon OpenStreetMap.</p>}
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${idea.explored ? 'bg-primary-soft text-primary-dark' : 'bg-[#22332F] text-white'}`}>{idea.explored ? '✓ Déjà découverte' : '? Jamais explorée'}</span>
        <a href={directionsUrl(idea.lat, idea.lng)} className="btn btn-outline min-h-11 px-4 text-[15px]">
          Y aller
        </a>
      </div>
    </article>
  )
}

/** « À découvrir » (maquette V3-ExplorerIdees) : autour de vous, choisi pour le chien. Pas d'IA, rien d'inventé. */
export default function Ideas() {
  const { dog } = useData()
  const back = useBack('/territoire')
  const { ideas, loading } = useIdeas()
  const [filter, setFilter] = useState<Filter>('tout')
  const filters = useMemo(() => {
    const present = new Set(ideas.map((i) => KIND[i.kind].filter))
    return (
      [
        ['tout', 'Tout'],
        ['jamais', 'Jamais explorés'],
        ['vue', 'Points de vue'],
        ['plage', 'Plages'],
        ['parc', 'Parcs'],
        ['eau', 'Eau'],
      ] as [Filter, string][]
    ).filter(([id]) => id === 'tout' || id === 'jamais' || id === 'vue' || id === 'plage' || present.has(id as 'parc'))
  }, [ideas])
  const shown = ideas.filter((i) => filter === 'tout' || (filter === 'jamais' ? !i.explored : KIND[i.kind].filter === filter)).slice(0, 6)
  const beaches = shown.some((i) => i.kind === 'beach')

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          La carte
        </button>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] leading-tight font-extrabold">À découvrir</h1>
          <p className="text-[17px] text-muted">Autour de vous, choisi pour {dog.name} : d’abord les lieux calmes.</p>
        </div>
        <div role="group" aria-label="Filtrer les idées" className="scroll-row -mx-5 flex gap-2 px-5">
          {filters.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-11 shrink-0 rounded-full border-2 border-solid px-4 text-[15px] font-bold ${filter === id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}>
              {label}
            </button>
          ))}
        </div>
        {shown.length ? shown.map((idea) => <IdeaCard key={idea.id} idea={idea} />) : <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[17px] leading-snug text-[#1D3F73]">{loading ? 'Recherche des lieux autour de vous…' : 'Rien à proposer ici pour l’instant. Importez une balade : les idées viennent autour d’elle.'}</p>}
        <p className="text-[13px] leading-snug text-muted">
          Lieux : © OpenStreetMap.{beaches ? ' Sur les plages, les chiens sont souvent interdits l’été : vérifiez le panneau à l’entrée.' : ''}
        </p>
      </main>
    </div>
  )
}
