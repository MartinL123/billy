export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded'

/**
 * Menu de partage natif (AirDrop, Mail, Enregistrer dans Fichiers, Calendrier…).
 * Sans partage de fichiers dans le navigateur : téléchargement du premier fichier.
 */
export async function shareFiles(files: File[], title: string): Promise<ShareOutcome> {
  try {
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, title })
      return 'shared'
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
  }
  const first = files[0]
  if (!first) return 'cancelled'
  const url = URL.createObjectURL(first)
  const link = document.createElement('a')
  link.href = url
  link.download = first.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export const safeFileName = (title: string) => title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'document'
