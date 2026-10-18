import { Link } from 'react-router-dom'
import { isNative } from '../../native'

/**
 * « Importer mes balades Strava » : ouvre l’écran d’import (archive Strava ou une seule balade). Dans l’app iOS, les
 * marches de la Watch arrivent seules : c’est un lien secondaire « Importer un fichier GPX » (T-001).
 */
export function ImportWalkButton({ main = false, className = 'px-5' }: { /** Action principale de l’écran (bouton plein). */ main?: boolean; className?: string }) {
  return (
    <div className={className}>
      <Link to="/importer" className={`btn ${main && !isNative() ? 'btn-main min-h-[54px]' : 'btn-outline min-h-12'} w-full gap-2`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19c3-1 4-5 7-6s5 2 9-2" />
          <circle cx="4" cy="19" r="2" />
          <circle cx="20" cy="11" r="2" />
        </svg>
        {isNative() ? 'Importer un fichier GPX' : 'Importer mes balades Strava'}
      </Link>
    </div>
  )
}
