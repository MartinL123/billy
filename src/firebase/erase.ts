import { getDocsFromServer, writeBatch, type DocumentReference } from 'firebase/firestore'
import { collection } from 'firebase/firestore'
import { db } from './app'
import { userCol } from './paths'

/** Toutes les collections d'un compte, sous users/{uid}/… */
export const USER_COLLECTIONS = ['dog', 'events', 'weights', 'entries', 'documents', 'sessions', 'exposures', 'bossProgress', 'places', 'xpLog', 'quests', 'dailyQuest', 'push', 'files']

// Pendant la suppression du compte, l'app ne doit pas recréer un profil vide en voyant le sien disparaître.
let closing = false
export const isClosingAccount = () => closing
export const setClosingAccount = (value: boolean) => {
  closing = value
}

/** Firestore limite un lot à 500 écritures. */
const BATCH_SIZE = 400

async function deleteAll(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref)
    await batch.commit()
  }
}

/**
 * Supprime tout ce que le compte a enregistré : profil, calendrier, carnet, progression, photos et documents
 * (y compris les morceaux de PDF). Lu sur le serveur pour ne rien oublier. Demande du réseau.
 */
export async function eraseUserData(): Promise<void> {
  for (const name of USER_COLLECTIONS) {
    const snap = await getDocsFromServer(userCol(name))
    if (name === 'files') {
      for (const file of snap.docs) {
        const chunks = await getDocsFromServer(collection(file.ref, 'chunks'))
        await deleteAll(chunks.docs.map((d) => d.ref))
      }
    }
    await deleteAll(snap.docs.map((d) => d.ref))
  }
}
