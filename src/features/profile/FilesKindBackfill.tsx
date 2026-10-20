import { updateDoc } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { send, userDoc } from '../../firebase/paths'
import { useData } from '../../firebase/store'
import { fileKinds } from '../../lib/fileKinds'
import { useToday } from '../../lib/useToday'

/**
 * R-069, une seule fois par compte (propriétaire seulement) : les fichiers d’avant reçoivent leur genre, photo ou
 * document, pour que firestore.rules puisse refuser les documents à un visiteur. Rien n’est supprimé ni déplacé.
 */
export function FilesKindBackfill() {
  const { dog, documents, entries, online } = useData()
  const today = useToday()
  const started = useRef(false)

  useEffect(() => {
    if (started.current || dog.filesKindBackfilled || dog.pending || !online) return
    started.current = true
    // Un fichier disparu fait échouer sa seule mise à jour, jamais les autres.
    for (const [id, kind] of fileKinds({ documents, entries, dog })) send(updateDoc(userDoc('files', id), { kind }))
    send(updateDoc(userDoc('dog', 'billy'), { filesKindBackfilled: today }))
  }, [dog, documents, entries, online, today])

  return null
}
