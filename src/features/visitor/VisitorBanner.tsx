import { Link } from 'react-router-dom'
import { useData } from '../../firebase/store'
import { useReadOnly } from '../../firebase/viewer'

/** En haut des onglets, chez un visiteur (T-048) : on regarde, on ne modifie rien. */
export function VisitorBanner() {
  const readOnly = useReadOnly()
  const { dog } = useData()
  if (!readOnly) return null
  return (
    <Link to="/profil" className="mx-4 mb-3 flex min-h-11 items-center gap-2.5 rounded-[16px] bg-primary-soft px-3.5 py-2.5 text-primary-dark no-underline">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="text-[0.8824rem] font-semibold">
        Vous regardez {dog.name} · lecture seule
      </span>
    </Link>
  )
}
