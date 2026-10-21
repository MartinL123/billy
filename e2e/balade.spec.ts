import { test as base, expect, type Page } from '@playwright/test'
import { bravo, finishButton, goHash, login, skipOpening, startWalk } from './app'
import { newUser, profileOnServer, serverDocs, serverWalks, type TestUser } from './emulator'
import { FakeIphone } from './fakeIphone'

// Protocole de casse de la balade (docs/profondeur/03-protocole-casse.md), cas 3, 4, 5, 9, 11 et 13.
// Chaque test : un compte neuf dans l'émulateur, un faux iPhone, l'app connectée.

const test = base.extend<{ fake: FakeIphone; user: TestUser; app: Page }>({
  fake: async ({ context }, use) => {
    const fake = new FakeIphone()
    await fake.install(context)
    await skipOpening(context)
    await use(fake)
  },
  user: async ({}, use) => {
    await use(await newUser())
  },
  app: async ({ context, fake, user }, use) => {
    // `fake` d'abord : le faux pont doit être posé avant que la page ne charge l'app.
    void fake
    const page = await context.newPage()
    await login(page, user)
    await expect.poll(() => profileOnServer(user.uid), { message: 'profil du premier lancement au serveur' }).toBe(true)
    await use(page)
  },
})

/** La balade arrive au serveur (l'émulateur) : on attend qu'il y en ait `n`. */
async function expectServerWalks(user: TestUser, n: number, timeout = 20_000) {
  await expect.poll(async () => (await serverWalks(user.uid)).length, { timeout, message: `${n} balade(s) au serveur` }).toBe(n)
}

test('cas 3 · app tuée pendant la balade : « Balade en cours · Reprendre / Terminer », la reprise garde le tracé', async ({ context, fake, user, app }) => {
  await startWalk(app)
  await fake.walkPoints(app, 20)
  await expect(app.getByText('380 m')).toBeVisible()
  // Tuer l'app (balayage) : la page se ferme, le fichier natif reste, le GPS s'arrête.
  await fake.kill(app)
  expect(fake.walk?.points).toHaveLength(20)

  const reopened = await context.newPage()
  await reopened.goto('./#/')
  await expect(reopened.getByText(/^Balade en cours · \d+/)).toBeVisible()
  await expect(reopened.getByText('L’enregistrement s’est arrêté quand l’app s’est fermée.')).toBeVisible()
  await expect(reopened.getByRole('link', { name: 'Terminer' })).toBeVisible()
  await reopened.getByRole('link', { name: 'Reprendre' }).click()

  // Reprise : la même balade (même départ), le GPS relancé, les 20 points déjà là.
  await expect(finishButton(reopened)).toBeEnabled()
  expect(fake.count('FlairNative.startWalk')).toBe(2)
  expect(fake.recording).toBe(true)
  await expect(reopened.getByText('380 m')).toBeVisible()
  await fake.walkPoints(reopened, 10)
  await expect(reopened.getByText('580 m')).toBeVisible()

  await finishButton(reopened).click()
  await expect(bravo(reopened)).toBeVisible()
  await expectServerWalks(user, 1)
  const [walk] = await serverWalks(user.uid)
  expect(JSON.stringify(walk?.fields)).toContain('"source":{"stringValue":"gps"}')
  expect(fake.walk).toBeUndefined()
})

test('cas 4 · hors ligne toute la balade : « Belle balade ! », en attente d’envoi, puis envoyée au retour du réseau', async ({ context, fake, user, app }) => {
  // Le tout premier lancement a besoin du réseau (fait à la connexion) ; ensuite, mode avion avant de partir.
  await context.setOffline(true)
  await startWalk(app)
  await fake.walkPoints(app, 20)
  await finishButton(app).click()
  await expect(bravo(app)).toBeVisible({ timeout: 30_000 })

  // Gardée sur l'iPhone jusqu'à l'envoi (T-061), visible « En attente d’envoi », rien au serveur.
  const entryId = fake.walk?.savedAs
  expect(entryId).toBeTruthy()
  expect(fake.count('FlairNative.clearWalk')).toBe(0)
  await goHash(app, `#/souvenir/${entryId}`)
  await expect(app.getByText('En attente d’envoi')).toBeVisible()
  expect(await serverWalks(user.uid)).toHaveLength(0)

  // Le réseau revient : la balade part, la copie de l'iPhone est effacée (PendingWalksSync).
  await context.setOffline(false)
  await expectServerWalks(user, 1, 30_000)
  await expect(app.getByText('En attente d’envoi')).toHaveCount(0)
  await expect.poll(() => fake.walk, { timeout: 15_000 }).toBeUndefined()
  expect(fake.count('FlairNative.clearSent')).toBeGreaterThan(0)
  expect((await serverWalks(user.uid))[0]?.name).toContain(`/entries/${entryId}`)
})

test('cas 5 · le réseau revient pendant l’enregistrement : une seule balade', async ({ context, fake, user, app }) => {
  await context.setOffline(true)
  await startWalk(app)
  await fake.walkPoints(app, 20)
  await finishButton(app).click()
  await context.setOffline(false)
  await expect(bravo(app)).toBeVisible({ timeout: 30_000 })
  await expectServerWalks(user, 1, 30_000)
  await expect.poll(() => fake.walk, { timeout: 15_000 }).toBeUndefined()
  // Rien ne repart en double quelques secondes plus tard.
  await app.waitForTimeout(3000)
  expect(await serverWalks(user.uid)).toHaveLength(1)
})

test('cas 9 · rechargement du site pendant la balade : l’écran revient avec tout le tracé', async ({ fake, app }) => {
  await startWalk(app)
  await fake.walkPoints(app, 20)
  await expect(app).toHaveURL(/#\/balade-en-cours$/)
  await app.reload()
  await expect(finishButton(app)).toBeEnabled()
  await expect(app.getByText('380 m')).toBeVisible()
  // Le GPS enregistrait encore : pas de nouveau départ, la même balade.
  expect(fake.count('FlairNative.startWalk')).toBe(1)
})

test('cas 9 · rechargement du site après « Belle balade ! » : aucune balade ne redémarre', async ({ fake, user, app }) => {
  await startWalk(app)
  await fake.walkPoints(app, 20)
  await finishButton(app).click()
  await expect(bravo(app)).toBeVisible()
  // Risque 1 : plus de « ?depart=1 » dans l'adresse.
  await expect(app).toHaveURL(/#\/balade-en-cours$/)
  await app.reload()
  await expect(app).toHaveURL(/#\/$/)
  await app.waitForTimeout(1500)
  expect(fake.count('FlairNative.startWalk')).toBe(1)
  expect(fake.walk).toBeUndefined()
  await expectServerWalks(user, 1)
})

test('cas 9 · rechargement juste après une « Belle balade ! » hors ligne : aucune balade ne redémarre', async ({ context, fake, app }) => {
  await context.setOffline(true)
  await startWalk(app)
  await fake.walkPoints(app, 20)
  await finishButton(app).click()
  await expect(bravo(app)).toBeVisible({ timeout: 30_000 })
  // Copie gardée sur l'iPhone (T-061) : `currentWalk` la renvoie avec `savedAs`, elle n'est plus « en cours ».
  expect(fake.walk?.savedAs).toBeTruthy()
  // Le réseau revient et le site est mis à jour juste après (rechargement). On attend que le site réponde à nouveau
  // (sans service worker, un rechargement trop tôt échouerait) ; la copie peut déjà être effacée ou pas encore.
  await context.setOffline(false)
  await expect.poll(() => app.evaluate(() => fetch(location.href, { cache: 'no-store' }).then((r) => r.ok, () => false))).toBe(true)
  await app.reload()
  await expect(app).toHaveURL(/#\/$/)
  await app.waitForTimeout(1500)
  expect(fake.count('FlairNative.startWalk')).toBe(1)
})

test('cas 11 · position refusée : « La position n’est pas autorisée » et le chemin vers Réglages', async ({ fake, app }) => {
  fake.denied = true
  await goHash(app, '#/balade-en-cours?depart=1')
  await expect(app.getByRole('heading', { name: 'La position n’est pas autorisée' })).toBeVisible()
  await expect(app.getByText('Réglages › Flair › Position › « Pendant l’utilisation de l’app »')).toBeVisible()
  expect(fake.walk).toBeUndefined()
  await app.getByRole('button', { name: 'Retour à l’accueil' }).click()
  await expect(app).toHaveURL(/#\/$/)
})

test('cas 13 · deux balades le même jour : deux balades, pas d’os en double', async ({ fake, user, app }) => {
  // A : partie il y a 60 min ; B : partie il y a 15 min (après la fin du tracé de A).
  fake.startMinutesAgo = 60
  await startWalk(app)
  await fake.walkPoints(app, 20)
  await finishButton(app).click()
  await expect(bravo(app)).toBeVisible()
  await expectServerWalks(user, 1)

  fake.startMinutesAgo = 15
  await startWalk(app)
  await expect(app.getByText('0 m', { exact: true })).toBeVisible()
  await fake.walkPoints(app, 20)
  await finishButton(app).click()
  await expect(bravo(app)).toBeVisible()
  await expectServerWalks(user, 2)
  await app.waitForTimeout(2000)
  const walks = await serverWalks(user.uid)
  expect(walks).toHaveLength(2)
  const keys = walks.map((w) => JSON.stringify((w.fields as Record<string, unknown>).importKey))
  expect(new Set(keys).size).toBe(2)

  // Les os : un identifiant par raison et par objet, jamais deux fois la même chose.
  const bones = await serverDocs(user.uid, 'bones')
  const ids = bones.map((b) => b.name.split('/').pop())
  expect(new Set(ids).size).toBe(ids.length)
  const walkIds = new Set(walks.map((w) => w.name.split('/').pop()))
  const perWalk = bones.filter((b) => walkIds.has(String((b.fields as { refId?: { stringValue?: string } }).refId?.stringValue)))
  expect(perWalk.length).toBeLessThanOrEqual(2)
})
