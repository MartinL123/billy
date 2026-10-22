import { useEffect, useState } from 'react'
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
import { useReadOnly } from '../../firebase/viewer'

/** Le poids : la courbe, les pesées, « Ajouter une pesée ». */
export default function HealthWeight() {
  const readOnly = useReadOnly()
  const { weights } = useData()
  const today = useToday()
  // Depuis la carte « Pesée du mois » (?ajouter=1) : la pesée s’ouvre tout de suite (T-013).
  // Le paramètre est retiré tout de suite : un retour ou un rechargement ne rouvre pas la pesée (T-026).
  const [params, setParams] = useSearchParams()
  const [weightSheet, setWeightSheet] = useState<{ editing?: WithId<Weight> } | null>(() => (params.get('ajouter') ? {} : null))
  useEffect(() => {
    if (params.has('ajouter')) setParams({}, { replace: true })
    // Une seule fois, à l’ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const lastWeight = weights[0]
  const year = parseISO(today).y
  return (
    <SubScreen title="Poids" titleInContent>
      <section className="card flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="title-section">Poids</h2>
            <div className="text-[0.7647rem] text-muted">{lastWeight ? `Pesé le ${formatShort(lastWeight.date, year)}` : 'Aucune pesée pour l’instant'}</div>
          </div>
          {lastWeight && (
            <div className="font-display text-[1.7647rem] font-bold tabular-nums">
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
                disabled={readOnly}
                onClick={() => setWeightSheet({ editing: weight })}
                className="flex min-h-12 items-center gap-3 border-0 border-t border-solid border-divider bg-transparent px-0 text-left text-[1rem] text-text"
              >
                <span className="flex-1">{formatShort(weight.date, year)}</span>
                <span className="font-semibold">{formatKg(weight.kg)} kg</span>
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              </button>
            ))}
          </div>
        )}
        {!readOnly && (
          <button type="button" onClick={() => setWeightSheet({})} className={outlineButton}>
            Ajouter une pesée
          </button>
        )}
      </section>

      {weightSheet && <WeightSheet today={today} weights={weights} editing={weightSheet.editing} onClose={() => setWeightSheet(null)} />}
    </SubScreen>
  )
}
