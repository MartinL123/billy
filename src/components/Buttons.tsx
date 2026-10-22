import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { CloseIcon, LayersIcon, LocateIcon, TrashIcon } from './Icons'

interface DangerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Poubelle pour « Supprimer… » (défaut), croix pour « Annuler la balade », rien pour « Retirer ». */
  icon?: 'trash' | 'cross' | 'none'
  children: ReactNode
}

/**
 * T-106 : tout « Supprimer… » et « Annuler la balade » : tertiary rouge (contour 2 px #B3261E, fond blanc, texte rouge
 * à 6,5:1), son icône, pleine largeur. L’écran demande toujours une confirmation avant d’agir (ConfirmSheet).
 */
export function DangerButton({ icon = 'trash', className = '', children, type = 'button', ...button }: DangerButtonProps) {
  return (
    <button type={type} className={`btn btn-danger w-full ${className}`} {...button}>
      {icon === 'trash' && <TrashIcon size={20} />}
      {icon === 'cross' && <CloseIcon size={20} />}
      {children}
    </button>
  )
}

interface MapButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind: 'display' | 'locate'
  /** « Me situer » actif : seule l’icône passe en bleu, le texte garde sa couleur (contraste, R-067). */
  active?: boolean
  busy?: boolean
}

/** T-106 : « Affichage » (calques) et « Me situer » (cible), les mêmes sur toutes les cartes, toujours avec leur icône. */
export function MapButton({ kind, active = false, busy = false, className = '', type = 'button', ...button }: MapButtonProps) {
  const Icon = kind === 'display' ? LayersIcon : LocateIcon
  return (
    <button type={type} className={`tap map-btn ${className}`} {...button}>
      <Icon size={18} className={`${busy ? 'animate-pulse' : ''} ${active ? 'text-[#2F7BF6]' : ''}`} />
      {kind === 'display' ? 'Affichage' : 'Me situer'}
    </button>
  )
}
