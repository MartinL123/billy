// Une attente qui ne dure jamais toujours (R-042) : au-delà du délai, la promesse échoue avec un message lisible.

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} : pas de réponse après ${Math.round(ms / 1000)} s`)
    this.name = 'TimeoutError'
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms)
  })
  return Promise.race([promise, late]).finally(() => clearTimeout(timer))
}

/** Le texte d’une erreur, quelle qu’elle soit (Error, rejet du pont Capacitor, texte). */
export function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown }
    if (e.message) return `${e.code ? `${String(e.code)} ` : ''}${String(e.message)}`
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}
