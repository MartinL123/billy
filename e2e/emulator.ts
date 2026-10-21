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

/**
 * Le profil du premier lancement (et ses marques de rattrapage) est arrivé au serveur. Avant, couper le réseau
 * laisserait un compte tout neuf dont le profil n'existe que dans le cache local : ce n'est pas le cas à tester
 * (sauf T-074, qui ne regarde que le profil : `backfills: false`).
 */
export async function profileOnServer(uid: string, { backfills = true } = {}): Promise<boolean> {
  const response = await fetch(`${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}/dog/billy`, {
    headers: { Authorization: 'Bearer owner' },
  })
  if (!response.ok) return false
  const fields = ((await response.json()) as FirestoreDoc).fields ?? {}
  if (!backfills) return true
  return ['bonesBackfilled', 'fog25Backfilled', 'filesKindBackfilled'].every((key) => key in fields)
}
