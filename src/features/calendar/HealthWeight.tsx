import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { outlineButton } from '../../components/Form'
import { ChevronRightIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { useData } from '../../firebase/store'
import type { Weight, WithId } from '../../firebase/types'
import { formatLong, formatShort, parseISO } from '../../lib/dates'
import { useToday } from '../../lib/useToday'
import { SubScreen } from './SubScreen'
import { WeightChart } from './WeightChart'
import { formatKg, WeightSheet } from './WeightSheet'

/** Le poids : la courbe, les pesées, « Ajouter une pesée ». */
export default function HealthWeight() {
  const { weights } = useData()
  const today = useToday()
  // Depuis la carte « Pesée du mois » (?ajouter=1) : la pesée s’ouvre tout de suite (T-013).
  const [params] = useSearchParams()
  const [weightSheet, setWeightSheet] = useState<{ editing?: WithId<Weight> } | null>(() => (params.get('ajouter') ? {} : null))
  const lastWeight = weights[0]
  const year = parseISO(today).y
  return (
    <SubScreen title="Poids" titleInContent>
      <section className="card flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[19px] font-bold">Poids</h2>
            <div className="text-[13px] text-muted">{lastWeight ? `Pesé le ${formatShort(lastWeight.date, year)}` : 'Aucune pesée pour l’instant'}</div>
          </div>
          {lastWeight && (
            <div className="font-display text-[30px] font-bold">
              {formatKg(lastWeight.kg)} <span className="font-sans text-base font-semibold text-muted">kg</span>
            </div>
          )}
        </div>
        {lastWeight && <Pending show={lastWeight.pending} />}
        <WeightChart weights={weights} />
        {weights.length > 0 && (
          <div className="flex flex-col">
            {weights.slice(0, 5).map((weight) => (
              <button
                key={weight.id}
                type="button"
                aria-label={`Modifier la pesée du ${formatLong(weight.date)}`}
                onClick={() => setWeightSheet({ editing: weight })}
                className="flex min-h-12 items-center gap-3 border-0 border-t border-solid border-divider bg-transparent px-0 text-left text-[17px] text-text"
              >
                <span className="flex-1">{formatShort(weight.date, year)}</span>
                <span className="font-semibold">{formatKg(weight.kg)} kg</span>
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setWeightSheet({})} className={outlineButton}>
          Ajouter une pesée
        </button>
      </section>

      {weightSheet && <WeightSheet today={today} weights={weights} editing={weightSheet.editing} onClose={() => setWeightSheet(null)} />}
    </SubScreen>
  )
}
