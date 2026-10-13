import type { Feeling } from '../../lib/moment'

/** Les trois visages : la bouche dit le ressenti, le mot aussi. */
export function Face({ feeling, size = 40 }: { feeling: Feeling; size?: number }) {
  const mouth = feeling === 'difficile' ? 'M9 16.5c1.800-1.600 4.200-1.600 6 0' : feeling === 'bien' ? 'M9 15.500h6' : 'M8.500 14.500c2 2.400 5 2.400 7 0'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.500" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" />
      <path d={mouth.replace(/(\.\d)00/g, '$1')} />
    </svg>
  )
}
