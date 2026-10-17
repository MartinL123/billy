import type { ImportedWalk, TimedPoint } from '../../lib/balade'
// Photos choisies depuis l'accueil ou l'état vide, en attente du formulaire d'entrée.
let draft: File[] = []

export function setDraftPhotos(files: File[]): void {
  draft = files
}

export function takeDraftPhotos(): File[] {
  const files = draft
  draft = []
  return files
}

// Balade importée depuis le Carnet (fichier GPX), en attente du formulaire « Noter ».
export interface DraftWalk {
  name?: string
  walk: ImportedWalk
  /** Points d'origine avec leur heure (pour placer les photos prises pendant la balade). */
  raw: TimedPoint[]
}
let walkDraft: DraftWalk | null = null

export function setDraftWalk(walk: DraftWalk): void {
  walkDraft = walk
}

export function takeDraftWalk(): DraftWalk | null {
  const walk = walkDraft
  walkDraft = null
  return walk
}
