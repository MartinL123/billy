import type { ReactNode } from 'react'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const BOSS_PATHS: Record<string, ReactNode> = {
  // Le Lien : un regard
  lien: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  // Le Calme : une lune
  calme: <path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z" />,
  // Les Soins : une croix
  soins: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  // La Laisse : une boucle
  laisse: <path d="M5 5c0 6 4 4 4 9a3 3 0 0 0 6 0c0-3-2-3-2-6s3-3 6-3" />,
  // Le Rappel : une flèche qui revient
  rappel: (
    <>
      <path d="M20 8a8 8 0 1 0 0 8" />
      <polyline points="20 3 20 8 15 8" />
    </>
  ),
  // Les Bonnes manières : une patte
  manieres: (
    <>
      <ellipse cx="7.5" cy="9" rx="1.5" ry="2" />
      <ellipse cx="12" cy="7" rx="1.5" ry="2" />
      <ellipse cx="16.5" cy="9" rx="1.5" ry="2" />
      <path d="M12 12c-2.5 0-4.5 2.5-4.5 4.5 0 1.5 1.2 2 2.3 2 .900 0 1.5-.500 2.2-.500s1.3.500 2.2.500c1.1 0 2.3-.500 2.3-2 0-2-2-4.5-4.5-4.5z" />
    </>
  ),
  // La Nouveauté : une étincelle
  nouveaute: <path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />,
  // La Ville : des immeubles
  ville: (
    <>
      <path d="M4 20V9l6-3v14M10 20V4l10 4v12M2 20h20" />
      <path d="M14 11h2M14 15h2" />
    </>
  ),
  // Les Rencontres : une personne
  rencontres: (
    <>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" />
    </>
  ),
  // Les Congénères : deux têtes
  congeneres: (
    <>
      <circle cx="8" cy="10" r="3" />
      <circle cx="16.5" cy="11" r="2.5" />
      <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M15 15.5c3-.500 6 1 6 3.5" />
    </>
  ),
}

export function BossIcon({ bossId, size = 24 }: { bossId: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      {BOSS_PATHS[bossId]}
    </svg>
  )
}
