import { CloudPendingIcon } from './Icons'

/** « en attente d'envoi » sur un élément écrit hors ligne (hasPendingWrites). */
export function Pending({ show, className = '' }: { show: boolean; className?: string }) {
  if (!show) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-semibold text-info ${className}`}>
      <CloudPendingIcon size={16} />
      En attente d'envoi
    </span>
  )
}
