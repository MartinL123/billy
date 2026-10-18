// Photos choisies depuis l’accueil ou l’état vide, en attente du formulaire d’entrée.
let draft: File[] = []

export function setDraftPhotos(files: File[]): void {
  draft = files
}

export function takeDraftPhotos(): File[] {
  const files = draft
  draft = []
  return files
}

