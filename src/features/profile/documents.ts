import type { BillyDocument, DocumentCategory } from '../../firebase/types'

export const CATEGORIES: { value: DocumentCategory; label: string; short: string }[] = [
  { value: 'sante', label: 'Santé', short: 'Santé' },
  { value: 'veto', label: 'Véto', short: 'Véto' },
  { value: 'administratif', label: 'Administratif', short: 'Admin.' },
  { value: 'autre', label: 'Autre', short: 'Autre' },
]

export const categoryLabel = (category: string) => CATEGORIES.find((c) => c.value === category)?.label ?? 'Autre'

/** Vignette « PDF » bleue ou « SCAN » rouge, comme dans les maquettes. */
export function kindBadge(kind: BillyDocument['kind']) {
  return kind === 'pdf'
    ? { label: 'PDF', className: 'border-[#C9D6EF] bg-info-soft text-info' }
    : { label: 'SCAN', className: 'border-[#EBC7C3] bg-[#F6E3E1] text-[#9A2F28]' }
}
