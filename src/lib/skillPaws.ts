// Les étapes d’une compétence en pattes (V5, T-052) : jamais « 3 sur 5 ». 4 pattes puis un trophée pour la 5ᵉ étape.

export type PawState = 'acquise' | 'en-cours' | 'a-venir'

export const STEPS = 5

/** L’état de chaque étape : acquise (dorée), en cours (pointillés qui respirent), à venir (grise). */
export function skillPaws(level: number): PawState[] {
  const done = Math.max(0, Math.min(STEPS, Math.floor(level)))
  return Array.from({ length: STEPS }, (_, i) => (i < done ? 'acquise' : i === done ? 'en-cours' : 'a-venir'))
}

/** Le libellé accessible, sans chiffre à battre : « 1 étape acquise, la suivante est en route ». */
export function pawsLabel(level: number): string {
  const done = Math.max(0, Math.min(STEPS, Math.floor(level)))
  if (done >= STEPS) return 'Toutes les étapes sont acquises'
  if (done === 0) return 'La première étape est en route'
  return `${done} étape${done > 1 ? 's' : ''} acquise${done > 1 ? 's' : ''}, la suivante est en route`
}
