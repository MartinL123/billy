import type { CSSProperties, ReactNode } from 'react'

// Dessins de la boutique, en SVG simple (repère 100 × 100, posé sur la photo ronde du chien).

const ACCESSORIES: Record<string, ReactNode> = {
  'bandana-rouge': (
    <>
      <path d="M22 70 Q50 84 78 70 L50 99 Z" fill="#C4423A" stroke="#8E2A24" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="44" cy="80" r="2" fill="#FFFFFF" />
      <circle cx="56" cy="80" r="2" fill="#FFFFFF" />
      <circle cx="50" cy="89" r="2" fill="#FFFFFF" />
    </>
  ),
  'noeud-papillon': (
    <>
      <path d="M50 86 L33 76 L33 96 Z M50 86 L67 76 L67 96 Z" fill="#2559A8" stroke="#183D75" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="50" cy="86" r="5" fill="#183D75" />
    </>
  ),
  casquette: (
    <>
      <path d="M24 30 Q50 -2 76 30 Z" fill="#C2571A" stroke="#8A3E0C" strokeWidth="2" strokeLinejoin="round" />
      <path d="M62 28 Q86 26 92 34 Q78 36 62 32 Z" fill="#8A3E0C" />
      <circle cx="50" cy="12" r="3" fill="#8A3E0C" />
    </>
  ),
  lunettes: (
    <>
      <rect x="20" y="36" width="25" height="16" rx="7" fill="#18201E" opacity="0.88" />
      <rect x="55" y="36" width="25" height="16" rx="7" fill="#18201E" opacity="0.88" />
      <path d="M45 42 Q50 38 55 42" fill="none" stroke="#18201E" strokeWidth="3" />
      <path d="M24 39 L32 39" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </>
  ),
  couronne: <path d="M28 26 L33 6 L42 18 L50 2 L58 18 L67 6 L72 26 Z" fill="#F2B544" stroke="#8A6514" strokeWidth="2" strokeLinejoin="round" />,
  cape: (
    <>
      <path d="M14 66 Q50 86 86 66 L96 100 L4 100 Z" fill="#7B4FC9" stroke="#5A3796" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="50" cy="80" r="5" fill="#F2B544" stroke="#8A6514" strokeWidth="1.5" />
    </>
  ),
}

const FRAMES: Record<string, ReactNode> = {
  'cadre-dore': <circle cx="50" cy="50" r="47" fill="none" stroke="#F2B544" strokeWidth="6" />,
  'cadre-fleurs': (
    <>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#F4B6C8" strokeWidth="5" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <circle key={i} cx={50 + 47 * Math.cos(a)} cy={50 + 47 * Math.sin(a)} r="5" fill="#E26D93" stroke="#FFFFFF" strokeWidth="1.5" />
      })}
    </>
  ),
  'cadre-pois': <circle cx="50" cy="50" r="47" fill="none" stroke="#2559A8" strokeWidth="6" strokeDasharray="0.1 9" strokeLinecap="round" />,
}

/** Ce que le chien porte, posé sur sa photo ronde. Le conteneur de la photo doit être `relative`. */
export function Worn({ accessory, frame }: { accessory?: string; frame?: string }) {
  if (!accessory && !frame) return null
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {frame && FRAMES[frame]}
      {accessory && ACCESSORIES[accessory]}
    </svg>
  )
}

/** Fonds de l'arbre : un motif léger, toujours derrière des cartes blanches (les contrastes ne changent pas). */
export const BACKGROUNDS: Record<string, CSSProperties> = {
  'fond-automne': {
    backgroundColor: '#FBF1E4',
    backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(194,87,26,0.18) 0 6px, transparent 7px), radial-gradient(circle at 70% 70%, rgba(242,181,68,0.25) 0 5px, transparent 6px)',
    backgroundSize: '90px 90px',
  },
  'fond-neige': {
    backgroundColor: '#EEF4FA',
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.95) 0 3px, transparent 4px), radial-gradient(circle, rgba(255,255,255,0.8) 0 2px, transparent 3px)',
    backgroundSize: '60px 60px, 37px 37px',
    backgroundPosition: '0 0, 18px 22px',
  },
  'fond-mer': {
    backgroundColor: '#EAF3F7',
    backgroundImage: 'linear-gradient(180deg, #EAF3F7 0%, #F6EEDC 100%)',
  },
}

const STICKERS: Record<string, ReactNode> = {
  'sticker-patte': (
    <g fill="#1E5A50">
      <ellipse cx="7" cy="8" rx="1.8" ry="2.3" />
      <ellipse cx="12" cy="6" rx="1.8" ry="2.3" />
      <ellipse cx="17" cy="8" rx="1.8" ry="2.3" />
      <path d="M12 11c-3 0-5.5 3.2-5.5 5.6 0 1.8 1.4 2.6 2.8 2.6 1.1 0 1.8-.6 2.7-.6s1.6.6 2.7.6c1.4 0 2.8-.8 2.8-2.6C17.5 14.2 15 11 12 11z" />
    </g>
  ),
  'sticker-coeur': <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#E26D93" />,
  'sticker-os': (
    <g transform="rotate(-30 12 12)">
      <g fill="#8A6514" stroke="#8A6514" strokeWidth="2.6">
        <circle cx="5.2" cy="9.6" r="2.6" />
        <circle cx="5.2" cy="14.4" r="2.6" />
        <circle cx="18.8" cy="9.6" r="2.6" />
        <circle cx="18.8" cy="14.4" r="2.6" />
        <rect x="5.5" y="10" width="13" height="4" />
      </g>
      <g fill="#F6E7C8">
        <circle cx="5.2" cy="9.6" r="2.6" />
        <circle cx="5.2" cy="14.4" r="2.6" />
        <circle cx="18.8" cy="9.6" r="2.6" />
        <circle cx="18.8" cy="14.4" r="2.6" />
        <rect x="5.5" y="10" width="13" height="4" />
      </g>
    </g>
  ),
  'sticker-soleil': (
    <g stroke="#E0A21B" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" fill="#F2B544" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </g>
  ),
}

export function Sticker({ id, size = 28 }: { id?: string; size?: number }) {
  if (!id || !STICKERS[id]) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      {STICKERS[id]}
    </svg>
  )
}

/** L'illustration d'un objet sur sa carte de la boutique. */
export function ItemArt({ id, category }: { id: string; category: string }) {
  if (category === 'sticker') return <Sticker id={id} size={56} />
  if (category === 'fond') return <span className="block size-[76px] rounded-2xl border border-solid border-divider" style={BACKGROUNDS[id]} />
  if (category === 'couleur') {
    const color = id === 'couleur-nuit' ? '#2B4C7E' : '#6B3A6E'
    return (
      <span className="flex size-[76px] items-center justify-center rounded-full" style={{ background: color }}>
        <span className="size-8 rounded-full bg-white/90" />
      </span>
    )
  }
  return (
    <span className="relative block size-[76px] rounded-full bg-milestone-soft">
      <Worn accessory={category === 'accessoire' ? id : undefined} frame={category === 'cadre' ? id : undefined} />
    </span>
  )
}
