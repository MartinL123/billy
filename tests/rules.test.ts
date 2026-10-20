import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, getDocs, collection, query, setDoc, where } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

// Règles de sécurité : chaque compte ne lit et n'écrit que users/{son uid}/…
// À lancer avec `npm run test:rules` (démarre l'émulateur Firestore).

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-billy',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
  // Des données existent déjà chez les deux comptes.
  await env.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), 'users/alice/dog/billy'), { name: 'Rex' })
    await setDoc(doc(admin.firestore(), 'users/alice/entries/e1'), { date: '2026-10-13', text: 'Balade' })
    await setDoc(doc(admin.firestore(), 'users/bob/dog/billy'), { name: 'Luna' })
    await setDoc(doc(admin.firestore(), 'users/bob/files/f1/chunks/0'), { index: 0 })
  })
})

afterAll(async () => {
  await env.cleanup()
})

describe('firestore.rules : deux comptes', () => {
  it('chaque compte lit et écrit ses propres données', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'users/alice/dog/billy')))
    await assertSucceeds(getDocs(collection(alice, 'users/alice/entries')))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/entries/e2'), { date: '2026-10-14', text: 'Jeu' }))
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/entries/e1')))
  })

  it('un compte ne lit rien chez un autre', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertFails(getDoc(doc(alice, 'users/bob/dog/billy')))
    await assertFails(getDocs(collection(alice, 'users/bob/entries')))
    await assertFails(getDoc(doc(alice, 'users/bob/files/f1/chunks/0')))
    // Les os et la boutique d'un autre compte restent invisibles, et on ne peut pas s'en attribuer chez lui.
    await assertFails(getDocs(collection(alice, 'users/bob/bones')))
    await assertFails(setDoc(doc(alice, 'users/bob/bones/mission-2026-10-14'), { amount: 10 }))
    await assertFails(getDoc(doc(alice, 'users/bob/inventory/cape')))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/bones/mission-2026-10-14'), { date: '2026-10-14', amount: 10, reason: 'mission', refId: '2026-10-14' }))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/inventory/cape'), { boughtAt: '2026-10-14', price: 300 }))
    // L'abonnement aux notifications d'un autre compte reste invisible.
    await assertFails(getDoc(doc(alice, 'users/bob/push/iphone')))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/push/iphone'), { time: '21:00' }))
  })

  it('un compte n’écrit et ne supprime rien chez un autre', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'users/bob/dog/billy'), { name: 'Piraté' }))
    await assertFails(setDoc(doc(alice, 'users/bob/entries/x'), { date: '2026-10-13', text: 'Intrus' }))
    await assertFails(deleteDoc(doc(alice, 'users/bob/dog/billy')))
  })

  it('sans être connecté, on n’accède à rien', async () => {
    const visitor = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(visitor, 'users/alice/dog/billy')))
    await assertFails(setDoc(doc(visitor, 'users/alice/entries/x'), { text: 'Intrus' }))
  })

  it('rien n’existe en dehors de users/{uid}', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertFails(getDoc(doc(alice, 'public/info')))
    // Le document users/{uid} lui-même appartient à son propriétaire, jamais à un autre compte.
    await assertFails(setDoc(doc(alice, 'users/bob'), { admin: true }))
    await assertFails(getDoc(doc(alice, 'users/bob')))
    await assertFails(getDocs(collection(alice, 'users')))
  })

  it('la meute : lisible par les comptes connectés, chacun ne modifie que ce qu’il a créé', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const visitor = env.unauthenticatedContext().firestore()
    await assertSucceeds(setDoc(doc(alice, 'community/meute/members/alice'), { dogName: 'Rex' }))
    await assertFails(setDoc(doc(alice, 'community/meute/members/bob'), { dogName: 'Piraté' }))
    await assertSucceeds(getDoc(doc(bob, 'community/meute/members/alice')))
    await assertFails(getDoc(doc(visitor, 'community/meute/members/alice')))

    await assertSucceeds(setDoc(doc(alice, 'community/meute/spots/parc'), { name: 'Parc', createdBy: 'alice' }))
    await assertFails(setDoc(doc(alice, 'community/meute/spots/faux'), { name: 'Faux', createdBy: 'bob' }))
    await assertFails(setDoc(doc(bob, 'community/meute/spots/parc'), { name: 'Renommé', createdBy: 'bob' }))
    await assertSucceeds(setDoc(doc(bob, 'community/meute/spots/parc/calm/bob'), { level: 'calme', slot: 'matin' }))
    await assertFails(setDoc(doc(bob, 'community/meute/spots/parc/calm/alice'), { level: 'anime', slot: 'soir' }))

    await assertSucceeds(setDoc(doc(bob, 'community/meute/marks/bob_parc_2026-10-14'), { uid: 'bob', spotId: 'parc', date: '2026-10-14' }))
    await assertFails(setDoc(doc(bob, 'community/meute/marks/alice_parc_2026-10-14'), { uid: 'alice', spotId: 'parc', date: '2026-10-14' }))
    await assertFails(deleteDoc(doc(alice, 'community/meute/marks/bob_parc_2026-10-14')))
    await assertSucceeds(getDocs(collection(alice, 'community/meute/marks')))

    await assertSucceeds(setDoc(doc(alice, 'community/meute/challenges/2026-10-12/rows/alice'), { days: [] }))
    await assertFails(setDoc(doc(alice, 'community/meute/challenges/2026-10-12/rows/bob'), { days: [] }))
    await assertFails(getDocs(collection(visitor, 'community/meute/spots')))
  })
})

describe('firestore.rules : mode visiteur (T-048)', () => {
  const invite = async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'invites/abcdefghjkmn'), { owner: 'alice', createdAt: '2026-10-20' }))
  }

  it('avec un code valable, un proche devient spectateur et lit tout, sauf les documents', async () => {
    await invite()
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'users/alice/documents/d1'), { title: 'Passeport' })
      await setDoc(doc(admin.firestore(), 'users/alice/files/f1'), { data: 'x', kind: 'photo' })
    })
    const parent = env.authenticatedContext('parent').firestore()
    await assertSucceeds(setDoc(doc(parent, 'viewers/parent'), { owner: 'alice', code: 'abcdefghjkmn', email: 'p@x.fr' }))
    await assertSucceeds(getDoc(doc(parent, 'users/alice/dog/billy')))
    await assertSucceeds(getDocs(collection(parent, 'users/alice/entries')))
    // Une photo de souvenir se voit.
    await assertSucceeds(getDoc(doc(parent, 'users/alice/files/f1')))
    await assertSucceeds(getDoc(doc(parent, 'users/alice')))
    await assertFails(getDoc(doc(parent, 'users/alice/documents/d1')))
    await assertFails(getDocs(collection(parent, 'users/alice/documents')))
    // Jamais d'écriture, jamais un autre compte.
    await assertFails(setDoc(doc(parent, 'users/alice/entries/e9'), { date: '2026-10-20', text: 'Coucou' }))
    await assertFails(deleteDoc(doc(parent, 'users/alice/entries/e1')))
    await assertFails(getDoc(doc(parent, 'users/bob/dog/billy')))
  })

  it('R-069 : jamais les fichiers d’un document (ni leurs morceaux), jamais push', async () => {
    await invite()
    await env.withSecurityRulesDisabled(async (admin) => {
      const a = admin.firestore()
      await setDoc(doc(a, 'users/alice/files/page1'), { data: 'x', kind: 'document' })
      await setDoc(doc(a, 'users/alice/files/pdf1'), { chunkCount: 1, kind: 'document' })
      await setDoc(doc(a, 'users/alice/files/pdf1/chunks/0'), { data: 'x' })
      await setDoc(doc(a, 'users/alice/files/ancien'), { data: 'x' })
      await setDoc(doc(a, 'users/alice/files/photo1'), { data: 'x', kind: 'photo' })
      await setDoc(doc(a, 'users/alice/push/abonnement'), { endpoint: 'https://x' })
    })
    const parent = env.authenticatedContext('parent').firestore()
    await assertSucceeds(setDoc(doc(parent, 'viewers/parent'), { owner: 'alice', code: 'abcdefghjkmn' }))
    await assertFails(getDoc(doc(parent, 'users/alice/files/page1')))
    await assertFails(getDoc(doc(parent, 'users/alice/files/pdf1')))
    await assertFails(getDoc(doc(parent, 'users/alice/files/pdf1/chunks/0')))
    await assertFails(getDocs(collection(parent, 'users/alice/files/pdf1/chunks')))
    // Un fichier d'avant, sans genre : refusé jusqu'au rattrapage.
    await assertFails(getDoc(doc(parent, 'users/alice/files/ancien')))
    await assertFails(getDocs(collection(parent, 'users/alice/files')))
    await assertSucceeds(getDocs(query(collection(parent, 'users/alice/files'), where('kind', '==', 'photo'))))
    await assertSucceeds(getDoc(doc(parent, 'users/alice/files/photo1')))
    await assertFails(getDoc(doc(parent, 'users/alice/push/abonnement')))
    await assertFails(getDocs(collection(parent, 'users/alice/push')))
    // Le propriétaire, lui, lit tout.
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'users/alice/files/page1')))
    await assertSucceeds(getDoc(doc(alice, 'users/alice/files/pdf1/chunks/0')))
  })

  it('sans code valable, personne ne devient spectateur', async () => {
    await invite()
    const intrus = env.authenticatedContext('intrus').firestore()
    await assertFails(setDoc(doc(intrus, 'viewers/intrus'), { owner: 'alice', code: 'mauvaiscode1' }))
    await assertFails(setDoc(doc(intrus, 'viewers/intrus'), { owner: 'bob', code: 'abcdefghjkmn' }))
    // On ne se déclare jamais à la place d'un autre, et les invitations ne se listent pas.
    await assertFails(setDoc(doc(intrus, 'viewers/parent'), { owner: 'alice', code: 'abcdefghjkmn' }))
    await assertFails(getDocs(collection(intrus, 'invites')))
    await assertFails(getDoc(doc(intrus, 'users/alice/dog/billy')))
  })

  it('le propriétaire voit et retire ses spectateurs ; une invitation ne se crée qu’à son nom', async () => {
    await invite()
    const parent = env.authenticatedContext('parent').firestore()
    await assertSucceeds(setDoc(doc(parent, 'viewers/parent'), { owner: 'alice', code: 'abcdefghjkmn' }))
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'viewers/parent')))
    await assertSucceeds(deleteDoc(doc(alice, 'viewers/parent')))
    await assertFails(getDoc(doc(parent, 'users/alice/dog/billy')))
    const bob = env.authenticatedContext('bob').firestore()
    await assertFails(setDoc(doc(bob, 'invites/zzzzzzzzzzzz'), { owner: 'alice' }))
    await assertFails(setDoc(doc(bob, 'invites/court'), { owner: 'bob' }))
  })
})
