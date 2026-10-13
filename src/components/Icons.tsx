import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function icon(children: ReactNode, defaults: SVGProps<SVGSVGElement> = {}) {
  return function Icon({ size = 22, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...defaults}
        {...props}
      >
        {children}
      </svg>
    )
  }
}

export const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.9" y1="4.9" x2="6.3" y2="6.3" />
    <line x1="17.7" y1="17.7" x2="19.1" y2="19.1" />
    <line x1="4.9" y1="19.1" x2="6.3" y2="17.7" />
    <line x1="17.7" y1="6.3" x2="19.1" y2="4.9" />
  </>,
)
export const CalendarIcon = icon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="3" x2="8" y2="7" />
    <line x1="16" y1="3" x2="16" y2="7" />
  </>,
)
export const PhotoIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="2" />
    <polyline points="21 16 16 11 6 20" />
  </>,
)
export const NoteIcon = icon(
  <>
    <path d="M5 4h10l4 4v12H5z" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </>,
)
export const DocumentIcon = icon(
  <>
    <path d="M6 3h8l4 4v14H6z" />
    <polyline points="14 3 14 7 18 7" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </>,
)
export const PlusIcon = icon(
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>,
)
export const CheckIcon = icon(<polyline points="5 12 10 17 19 7" />, { strokeWidth: 2.5 })
export const ChevronLeftIcon = icon(<polyline points="15 5 8 12 15 19" />)
export const ChevronRightIcon = icon(<polyline points="9 5 16 12 9 19" />)
export const CloseIcon = icon(
  <>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </>,
)
export const PhoneIcon = icon(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />)
export const ImportIcon = icon(
  <>
    <path d="M12 15V4" />
    <polyline points="7 9 12 4 17 9" />
    <path d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
  </>,
)
export const PaperclipIcon = icon(<path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7" />)
export const InfoIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <line x1="12" y1="7.5" x2="12" y2="7.6" />
  </>,
)
export const CloudCheckIcon = icon(
  <>
    <path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z" />
    <polyline points="9.5 13 11.5 15 15 11.5" />
  </>,
)
export const CloudPendingIcon = icon(
  <>
    <path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z" />
    <path d="M12 15.5v-4" />
    <polyline points="10 13 12 11 14 13" />
  </>,
)
export const TrashIcon = icon(
  <>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </>,
)

export function PawIcon({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
      <ellipse cx="7" cy="8" rx="1.8" ry="2.3" />
      <ellipse cx="12" cy="6" rx="1.8" ry="2.3" />
      <ellipse cx="17" cy="8" rx="1.8" ry="2.3" />
      <ellipse cx="4.6" cy="12.6" rx="1.6" ry="2" />
      <ellipse cx="19.4" cy="12.6" rx="1.6" ry="2" />
      <path d="M12 11c-3 0-5.5 3.2-5.5 5.6 0 1.8 1.4 2.6 2.8 2.6 1.1 0 1.8-.6 2.7-.6s1.6.6 2.7.6c1.4 0 2.8-.8 2.8-2.6C17.5 14.2 15 11 12 11z" />
    </svg>
  )
}
