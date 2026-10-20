import type { FileKind } from '../firebase/types'

// R-069 : chaque fichier dit ce qu’il contient, pour qu’un visiteur ne lise jamais les pages d’un document.
// Les fichiers d’avant ne le disent pas : on le retrouve une fois à partir de ce qui les utilise.


interface Sources {
  documents: { fileIds?: string[]; thumbFileId?: string }[]
  entries: { photos?: { fileId?: string; thumbFileId?: string }[] }[]
  dog: { photoFileId?: string; photoThumbFileId?: string }
}

/** Le genre de chaque fichier connu. Un fichier cité par un document reste un document, même s’il sert ailleurs. */
export function fileKinds({ documents, entries, dog }: Sources): Map<string, FileKind> {
  const kinds = new Map<string, FileKind>()
  const photo = (id?: string) => id && !kinds.has(id) && kinds.set(id, 'photo')
  for (const d of documents) for (const id of [...(d.fileIds ?? []), d.thumbFileId]) if (id) kinds.set(id, 'document')
  for (const e of entries) for (const p of e.photos ?? []) [p.fileId, p.thumbFileId].forEach(photo)
  ;[dog.photoFileId, dog.photoThumbFileId].forEach(photo)
  return kinds
}
