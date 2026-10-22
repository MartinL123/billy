import { statParts } from '../lib/stats'

export interface Stat {
  /** La valeur avec son unité (« 2,1 km », « 32 min ») ou seule (« 3 ») ; l’unité finale est séparée pour l’affichage. */
  value: string
  label: string
  /** Lu par VoiceOver à la place de la valeur (« 32 minutes »). */
  spoken?: string
}

/** Sur une ligne (`space-between`) dès que la place suffit ; sinon 2 colonnes. Seuils en rem : ils suivent la taille du texte. */
const ROW = { 2: 'flex', 3: 'grid grid-cols-2 @min-[15rem]:flex', 4: 'grid grid-cols-2 @min-[20rem]:flex' } as const

/**
 * La rangée de chiffres façon Komoot (V6 § 1, T-077) : 2 à 4 chiffres sur une ligne, valeur Bricolage 700 20 px en chiffres à
 * largeur fixe, unité collée en 15 px, libellé Figtree 13 px gris dessous. Si la place manque (petit écran, texte
 * agrandi : les seuils sont en rem, ils grandissent avec le texte), elle passe sur 2 colonnes.
 * R-090 : les chiffres d’une ligne restent alignés en haut.
 * T-106 (règle des maquettes) : la rangée en `space-between`, chaque chiffre centré sur son libellé, et ni le chiffre ni
 * son libellé ne passent à la ligne.
 * Sur les écrans de balade, aucune donnée chiffrée hors de ce composant.
 */
export function Stats({ items, className = '' }: { items: Stat[]; className?: string }) {
  const shown = items.filter((s) => s.value)
  if (shown.length === 0) return null
  const row = ROW[Math.min(4, Math.max(2, shown.length)) as 2 | 3 | 4]
  return (
    <div className={`@container ${className}`}>
      <dl className={`m-0 ${row} items-start justify-between justify-items-center gap-x-3 gap-y-2.5 text-center`}>
        {shown.map((s) => {
          const { value, unit } = statParts(s.value)
          return (
            <div key={s.label} className="flex flex-col-reverse items-center justify-end">
              <dt className="text-[0.7647rem] leading-tight whitespace-nowrap text-muted">{s.label}</dt>
              <dd className="m-0 font-display text-[1.1765rem] leading-tight font-bold whitespace-nowrap tabular-nums" {...(s.spoken ? { 'aria-label': s.spoken } : {})}>
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
