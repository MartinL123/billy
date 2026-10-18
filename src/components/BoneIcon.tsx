function BoneShape() {
  return (
    <>
      <circle cx="5.2" cy="9.6" r="2.6" />
      <circle cx="5.2" cy="14.4" r="2.6" />
      <circle cx="18.8" cy="9.6" r="2.6" />
      <circle cx="18.8" cy="14.4" r="2.6" />
      <rect x="5.5" y="10" width="13" height="4" />
    </>
  )
}

/** L’os, monnaie de l’effort : dessiné (crème, contour doré), jamais un émoji. */
export function BoneIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      {/* Deux fois la même forme : d’abord épaissie en doré (le contour), puis remplie en crème par-dessus. */}
      <g transform="rotate(-30 12 12)">
        <g fill="#8A6514" stroke="#8A6514" strokeWidth="3">
          <BoneShape />
        </g>
        <g fill="#F6E7C8">
          <BoneShape />
        </g>
      </g>
    </svg>
  )
}

/** « +13 os » avec l’os qui saute (désactivé si l’on réduit les animations). */
export function BonesGained({ amount, label }: { amount: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label && <span>{label}</span>}
      {amount > 0 && (
        <span className="inline-flex items-center gap-1 font-bold text-[#F7D58A]">
          <BoneIcon size={20} className="bone-jump" />+{amount} os
        </span>
      )}
    </span>
  )
}
