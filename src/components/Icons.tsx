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

export const PinIcon = icon(
  <>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>,
)

export const HomeIcon = icon(
  <>
    <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />
  </>,
)

export const HeartIcon = icon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.600A4 4 0 0 1 19 10c0 5.600-7 10-7 10z" />)

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
export const TargetIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </>,
)
export const FlameIcon = icon(<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />)
export const StarIcon = icon(<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.600 19.800l1.100-6.100L3.200 9.400l6.100-.800z" />)
export const LockIcon = icon(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
)
export const DiceIcon = icon(
  <>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" />
    <circle cx="15" cy="15" r="1" />
    <circle cx="15" cy="9" r="1" />
    <circle cx="9" cy="15" r="1" />
  </>,
)
export const TrashIcon = icon(
  <>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </>,
)

export function PawIcon({ size = 52, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <ellipse cx="7" cy="8" rx="1.8" ry="2.3" />
      <ellipse cx="12" cy="6" rx="1.8" ry="2.3" />
      <ellipse cx="17" cy="8" rx="1.8" ry="2.3" />
      <ellipse cx="4.6" cy="12.6" rx="1.6" ry="2" />
      <ellipse cx="19.4" cy="12.6" rx="1.6" ry="2" />
      <path d="M12 11c-3 0-5.5 3.2-5.5 5.6 0 1.8 1.4 2.6 2.8 2.6 1.1 0 1.8-.6 2.7-.6s1.6.6 2.7.6c1.4 0 2.8-.8 2.8-2.6C17.5 14.2 15 11 12 11z" />
    </svg>
  )
}
