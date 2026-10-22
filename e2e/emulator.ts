// Accès direct aux émulateurs Firebase (jamais au vrai projet : adresses 127.0.0.1 en dur, projet demo-billy).

export const AUTH_URL = 'http://127.0.0.1:9099'
export const FIRESTORE_URL = 'http://127.0.0.1:8080'
const PROJECT = 'demo-billy'
const PASSWORD = 'billy-emulateur'

export interface TestUser {
  email: string
  password: string
  uid: string
}

/** Un compte neuf par test : aucune balade d'un autre test ne s'y mélange. */
export async function newUser(): Promise<TestUser> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@billy.test`
  const response = await fetch(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  })
  const body = (await response.json()) as { localId?: string; error?: { message?: string } }
  if (!response.ok || !body.localId) throw new Error(`Compte de test impossible : ${body.error?.message ?? response.status}`)
  return { email, password: PASSWORD, uid: body.localId }
}

export interface FirestoreDoc {
  name: string
  fields?: Record<string, unknown>
}

/** Une collection du compte telle que le serveur (l'émulateur) l'a reçue ; « Bearer owner » passe outre les règles. */
export async function serverDocs(uid: string, collection: 'entries' | 'bones'): Promise<FirestoreDoc[]> {
  const response = await fetch(`${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}/${collection}?pageSize=300`, {
    headers: { Authorization: 'Bearer owner' },
  })
  if (!response.ok) throw new Error(`Lecture de l'émulateur impossible : ${response.status}`)
  const body = (await response.json()) as { documents?: FirestoreDoc[] }
  return body.documents ?? []
}

/** Les balades (entrées avec un tracé) arrivées au serveur. */
export async function serverWalks(uid: string): Promise<FirestoreDoc[]> {
  return (await serverDocs(uid, 'entries')).filter((d) => d.fields && 'route' in d.fields)
}

const BACKFILLS = ['bonesBackfilled', 'fog25Backfilled', 'filesKindBackfilled'] as const
const dogUrl = (uid: string) => `${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}/dog/billy`

/**
 * R-093 : le profil d'un compte neuf, posé au serveur AVANT la connexion, tel que le premier lancement l'écrit
 * (ensureProfile), avec les marques des rattrapages faits une seule fois. Les tests de la balade partent ainsi d'un
 * compte prêt, sans attendre ni dépendre du premier lancement (que T-074 teste, lui, pour de vrai).
 */
export async function seedProfile(uid: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const text = (value: string) => ({ stringValue: value })
  const fields = {
    name: text(''),
    birthDate: text(''),
    breed: text(''),
    adoptionDate: text(''),
    seedVersion: { integerValue: '3' },
    ...Object.fromEntries(BACKFILLS.map((key) => [key, text(today)])),
  }
  const response = await fetch(dogUrl(uid), {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) throw new Error(`Profil de test impossible : ${response.status}`)
}

/**
 * Le profil du premier lancement est arrivé au serveur ; avec `backfills`, les marques des trois rattrapages aussi
 * (T-074 : un compte neuf coupé du réseau au premier lancement finit dans le même état qu'un autre).
 */
export async function profileOnServer(uid: string, { backfills = true } = {}): Promise<boolean> {
  const response = await fetch(dogUrl(uid), { headers: { Authorization: 'Bearer owner' } })
  if (!response.ok) return false
  const fields = ((await response.json()) as FirestoreDoc).fields ?? {}
  return !backfills || BACKFILLS.every((key) => key in fields)
}

/** T-087 : le partage en direct live/{jeton} tel que le serveur l'a reçu (undefined s'il n'existe pas). */
export async function serverLive(token: string): Promise<Record<string, unknown> | undefined> {
  const response = await fetch(`${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents/live/${token}`, {
    headers: { Authorization: 'Bearer owner' },
  })
  if (!response.ok) return undefined
  return ((await response.json()) as FirestoreDoc).fields
}
