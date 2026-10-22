import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, deleteField, doc, getDoc, getDocs, collection, query, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

// Règles de sécurité : chaque compte ne lit et n'écrit que users/{son uid}/…
// À lancer avec `npm run test:rules` (démarre l'émulateur Firestore).

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    // RULES_PROJECT_ID : lancer ces tests sur un émulateur déjà ouvert sans effacer les données de demo-billy.
    projectId: process.env.RULES_PROJECT_ID ?? 'demo-billy',
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
  const inDays = (days: number) => Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000)
  const invite = async (code = 'abcdefghjkmn') => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, `invites/${code}`), { owner: 'alice', createdAt: '2026-10-20', expiresAt: inDays(7) }))
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
      await setDoc(doc(a, 'users/alice/journal/2026-10-21'), { date: '2026-10-21', events: [] })
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
    // T-066 : le journal de mesure reste privé.
    await assertFails(getDoc(doc(parent, 'users/alice/journal/2026-10-21')))
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
    await assertFails(setDoc(doc(bob, 'invites/zzzzzzzzzzzz'), { owner: 'alice', expiresAt: inDays(7) }))
    await assertFails(setDoc(doc(bob, 'invites/court'), { owner: 'bob', expiresAt: inDays(7) }))
  })

  it('R-070 : une invitation vaut 7 jours au plus et ne sert qu’une fois', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    // Sans date de fin, ou plus de 7 jours : refusée.
    await assertFails(setDoc(doc(alice, 'invites/sansdatefin1'), { owner: 'alice' }))
    await assertFails(setDoc(doc(alice, 'invites/troplongue12'), { owner: 'alice', expiresAt: inDays(8) }))
    // Expirée : plus personne ne devient spectateur avec.
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'invites/expireeeeeee'), { owner: 'alice', expiresAt: inDays(-1) })
    })
    const parent = env.authenticatedContext('parent').firestore()
    await assertFails(setDoc(doc(parent, 'viewers/parent'), { owner: 'alice', code: 'expireeeeeee' }))
    // Valable : acceptée une fois, le proche la supprime ; un second compte ne peut plus s'en servir.
    await invite()
    await assertSucceeds(setDoc(doc(parent, 'viewers/parent'), { owner: 'alice', code: 'abcdefghjkmn' }))
    await assertSucceeds(deleteDoc(doc(parent, 'invites/abcdefghjkmn')))
    const cousin = env.authenticatedContext('cousin').firestore()
    await assertFails(setDoc(doc(cousin, 'viewers/cousin'), { owner: 'alice', code: 'abcdefghjkmn' }))
    // Un inconnu ne supprime pas l'invitation d'un autre.
    await invite('autrecode123')
    await assertFails(deleteDoc(doc(cousin, 'invites/autrecode123')))
  })

  it('R-070 : « Retirer » : le propriétaire liste et supprime ses invitations en cours, personne d’autre', async () => {
    await invite()
    await invite('deuxiemecode')
    const alice = env.authenticatedContext('alice').firestore()
    const mine = await assertSucceeds(getDocs(query(collection(alice, 'invites'), where('owner', '==', 'alice'))))
    for (const d of mine.docs) await assertSucceeds(deleteDoc(d.ref))
    const bob = env.authenticatedContext('bob').firestore()
    await assertFails(getDocs(query(collection(bob, 'invites'), where('owner', '==', 'alice'))))
  })
})

describe('T-087 : partage en direct (live/{jeton})', () => {
  const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'
  const live = (extra: Record<string, unknown> = {}) => ({ ownerUid: 'alice', dogName: 'Billy', ownerName: 'Martin', startedAt: '2026-10-22T08:00:00Z', updatedAt: '2026-10-22T08:10:00Z', lat: 48.85, lng: 2.35, distanceM: 1400, status: 'en cours', ...extra })

  it('le propriétaire crée, met à jour, termine et supprime son partage', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, `live/${TOKEN}`), live()))
    await assertSucceeds(updateDoc(doc(alice, `live/${TOKEN}`), { lat: 48.86, distanceM: 1500, updatedAt: '2026-10-22T08:11:00Z' }))
    await assertSucceeds(updateDoc(doc(alice, `live/${TOKEN}`), { status: 'terminée', lat: deleteField(), lng: deleteField(), endsAt: '2026-10-22T08:44:00Z' }))
    await assertSucceeds(deleteDoc(doc(alice, `live/${TOKEN}`)))
  })

  it('sans compte : lire par le jeton oui, lister jamais, écrire jamais', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, `live/${TOKEN}`), live()))
    const anonyme = env.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anonyme, `live/${TOKEN}`)))
    // Un jeton inconnu se lit aussi (document absent) : rien ne dit s'il existe un autre partage.
    await assertSucceeds(getDoc(doc(anonyme, 'live/inconnuinconnuinconnu1')))
    await assertFails(getDocs(collection(anonyme, 'live')))
    await assertFails(getDocs(query(collection(anonyme, 'live'), where('ownerUid', '==', 'alice'))))
    await assertFails(setDoc(doc(anonyme, `live/${TOKEN}`), live()))
    await assertFails(deleteDoc(doc(anonyme, `live/${TOKEN}`)))
    // Même le propriétaire ne liste pas : il garde ses jetons dans son profil.
    await assertFails(getDocs(query(collection(alice, 'live'), where('ownerUid', '==', 'alice'))))
  })

  it('un autre compte ne modifie ni ne supprime le partage d’alice', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, `live/${TOKEN}`), live()))
    const bob = env.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(bob, `live/${TOKEN}`)))
    await assertFails(updateDoc(doc(bob, `live/${TOKEN}`), { lat: 0 }))
    await assertFails(setDoc(doc(bob, `live/${TOKEN}`), live({ ownerUid: 'bob' })))
    await assertFails(deleteDoc(doc(bob, `live/${TOKEN}`)))
    // Ni à son nom à elle.
    await assertFails(setDoc(doc(bob, 'live/BobBobBobBobBobBobBob1'), live()))
  })

  it('private/live (proches, jetons des partages) : le propriétaire seul, jamais un visiteur', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'users/alice/private/live'), { proches: [{ id: 'p1', name: 'Coralie', contact: '06 12 34 56 78' }], ownerName: 'Martin', liveShares: [{ token: TOKEN, startedAt: '2026-10-22T08:00:00Z', with: ['Coralie'] }] }))
    await assertSucceeds(getDoc(doc(alice, 'users/alice/private/live')))
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'viewers/parent'), { owner: 'alice', code: 'abcdefghjkmn' })
    })
    const parent = env.authenticatedContext('parent').firestore()
    // Le visiteur lit le profil du chien, pas private.
    await assertSucceeds(getDoc(doc(parent, 'users/alice/dog/billy')))
    await assertFails(getDoc(doc(parent, 'users/alice/private/live')))
    await assertFails(getDocs(collection(parent, 'users/alice/private')))
    await assertFails(setDoc(doc(parent, 'users/alice/private/live'), { ownerName: 'Intrus' }))
    const bob = env.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(bob, 'users/alice/private/live')))
  })

  it('le propriétaire ne change pas ownerUid ; champs et jeton vérifiés ; un visiteur ne crée rien', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, `live/${TOKEN}`), live()))
    await assertFails(updateDoc(doc(alice, `live/${TOKEN}`), { ownerUid: 'bob' }))
    await assertFails(setDoc(doc(alice, 'live/court'), live()))
    await assertFails(setDoc(doc(alice, 'live/AutreAutreAutreAutre12'), live({ route: 'tracé' })))
    await assertFails(setDoc(doc(alice, 'live/AutreAutreAutreAutre12'), live({ status: 'perdue' })))
    await assertFails(setDoc(doc(alice, 'live/AutreAutreAutreAutre12'), live({ lat: 'ici' })))
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'viewers/parent'), { owner: 'alice', code: 'abcdefghjkmn' })
    })
    const parent = env.authenticatedContext('parent').firestore()
    await assertFails(setDoc(doc(parent, 'live/ParentParentParentPare'), live({ ownerUid: 'parent' })))
  })
})
