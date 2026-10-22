import { statParts } from '../lib/stats'

export interface Stat {
  /** La valeur avec son unité (« 2,1 km », « 32 min ») ou seule (« 3 ») ; l’unité finale est séparée pour l’affichage. */
  value: string
  label: string
  /** Lu par VoiceOver à la place de la valeur (« 32 minutes »). */
  spoken?: string
}

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-2 @min-[14rem]:grid-cols-3', 4: 'grid-cols-2 @min-[19rem]:grid-cols-4' } as const

/**
 * La rangée de chiffres façon Komoot (V6 § 1, T-077) : 2 à 4 colonnes égales, valeur Bricolage 700 20 px en chiffres à
 * largeur fixe, unité collée en 15 px, libellé Figtree 13 px gris dessous. Si la place manque (petit écran, texte
 * agrandi : les seuils sont en rem, ils grandissent avec le texte), elle passe sur 2 colonnes.
 * R-090 : les chiffres d’une ligne restent alignés en haut ; un libellé long passe à la ligne dessous sans les décaler.
 * Sur les écrans de balade, aucune donnée chiffrée hors de ce composant.
 */
export function Stats({ items, className = '' }: { items: Stat[]; className?: string }) {
  const shown = items.filter((s) => s.value)
  if (shown.length === 0) return null
  const cols = COLS[Math.min(4, Math.max(2, shown.length)) as 2 | 3 | 4]
  return (
    <div className={`@container ${className}`}>
      <dl className={`m-0 grid gap-x-3 gap-y-2.5 ${cols}`}>
        {shown.map((s) => {
          const { value, unit } = statParts(s.value)
          return (
            <div key={s.label} className="flex min-w-0 flex-col-reverse justify-end">
              <dt className="text-[0.7647rem] leading-tight text-muted">{s.label}</dt>
              <dd className="m-0 font-display text-[1.1765rem] leading-tight font-bold tabular-nums" {...(s.spoken ? { 'aria-label': s.spoken } : {})}>
                {value}
                {unit && <span className="text-[0.8824rem] font-semibold">{' '}{unit}</span>}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
