/** « 2:59 » : le temps qui reste au minuteur. */
export function formatCountdown(seconds: number): string {
  const left = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}

/** Secondes restantes à un instant donné, jamais négatives. */
export const secondsLeft = (endsAt: number, now: number) => Math.max(0, (endsAt - now) / 1000)
