import { test as base, expect, type Page } from '@playwright/test'
import { bravo, finishButton, goHash, login, skipOpening, startWalk } from './app'
import { newUser, profileOnServer, seedProfile, serverDocs, serverLive, serverWalks, type TestUser } from './emulator'
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
    const user = await newUser()
    // R-093 : le profil est déjà au serveur à la connexion (le premier lancement lui-même : test T-074).
    await seedProfile(user.uid)
    await use(user)
  },
  app: async ({ context, fake, user }, use) => {
    // `fake` d'abord : le faux pont doit être posé avant que la page ne charge l'app.
    void fake
    const page = await context.newPage()
    await login(page, user)
    await use(page)
  },
})

/** La balade arrive au serveur (l'émulateur) : on attend qu'il y en ait `n`. */
async function expectServerWalks(user: TestUser, n: number, timeout = 30_000) {
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

test('T-099 · « Ne pas la garder » ramène à l’onglet Balades, rien n’est enregistré', async ({ fake, user, app }) => {
  await startWalk(app)
  await fake.walkPoints(app, 20)
  await app.getByRole('button', { name: 'Ne pas garder' }).click()
  await app.getByRole('button', { name: 'Ne pas la garder' }).click()
  await expect(app).toHaveURL(/#\/territoire$/)
  await expect(app.getByText('La balade n’a pas été gardée.')).toBeVisible()
  expect(fake.walk).toBeUndefined()
  expect(await serverWalks(user.uid)).toHaveLength(0)
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

// T-074 : un compte neuf qui perd le réseau avant que son profil arrive au serveur. Au retour du réseau, l'écouteur
// du profil pouvait le dire tour à tour présent et absent : l'app basculait sans fin entre le squelette et l'écran, et
// chaque bascule la remontait en entier (des centaines d'appels au natif en quelques secondes).
base('T-074 · compte neuf hors ligne avant l’envoi du profil : l’app reste stable au retour du réseau', async ({ context }) => {
  const fake = new FakeIphone()
  await fake.install(context)
  await skipOpening(context)
  const user = await newUser()
  const page = await context.newPage()
  await login(page, user)
  await context.setOffline(true)
  await page.waitForTimeout(1500)
  await context.setOffline(false)
  await expect.poll(() => profileOnServer(user.uid, { backfills: false }), { timeout: 30_000, message: 'profil au serveur' }).toBe(true)
  // R-093 : le profil n'est plus récrit en boucle (ce qui effaçait les marques) et les rattrapages ont lieu.
  await expect.poll(() => profileOnServer(user.uid), { timeout: 30_000, message: 'rattrapages du premier lancement au serveur' }).toBe(true)
  await page.waitForTimeout(1000)
  const before = fake.count('FlairNative.currentWalk')
  await page.waitForTimeout(5000)
  // Un montage de l'app = un appel ou deux ; une boucle en fait des centaines.
  expect(fake.count('FlairNative.currentWalk') - before).toBeLessThan(5)
  await expect(page.getByText('Ses sorties du jour')).toBeVisible()
})

// T-087 : partage en direct. Le lien s'ouvre sans compte, dans un autre navigateur ; la fin efface la position.
test('T-087 · partager en direct : le lien montre la balade sans compte, puis « Balade terminée »', async ({ browser, fake, user, app }) => {
  // La feuille de partage d'iOS : on garde ce qui lui est donné.
  await app.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        ;(window as unknown as { __shared?: ShareData }).__shared = data
        return Promise.resolve()
      },
    })
  })
  await startWalk(app)
  await fake.walkPoints(app, 6)
  await app.getByRole('switch', { name: 'Partager en direct' }).click()
  // Aucun proche encore : on en ajoute un, choisi d'office.
  await app.getByLabel('Prénom').fill('Coralie')
  await app.getByRole('button', { name: 'Ajouter ce proche' }).click()
  await expect(app.getByRole('checkbox', { name: /Coralie/ })).toBeChecked()
  await app.getByRole('button', { name: 'Partager', exact: true }).click()
  await expect(app.getByText('Partagé en direct avec Coralie')).toBeVisible()

  const url = await app.evaluate(() => (window as unknown as { __shared?: ShareData }).__shared?.url ?? '')
  const token = /#\/suivre\/([A-Za-z0-9_-]{22})$/.exec(url)?.[1]
  expect(token, url).toBeTruthy()
  await expect.poll(async () => (await serverLive(token!))?.status, { message: 'partage au serveur' }).toEqual({ stringValue: 'en cours' })
  const live = (await serverLive(token!))!
  expect(live.ownerUid).toEqual({ stringValue: user.uid })
  expect(live).toHaveProperty('lat')
  // Rien d'autre que ce qu'il faut : ni tracé, ni proches.
  expect(Object.keys(live).sort()).toEqual(['distanceM', 'dogName', 'lat', 'lng', 'ownerUid', 'startedAt', 'status', 'updatedAt'])

  // Un proche ouvre le lien sur son téléphone, sans compte.
  const other = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', serviceWorkers: 'block' })
  const follow = await other.newPage()
  await follow.goto(url)
  await expect(follow.getByRole('heading', { name: /est en balade depuis \d+\smin · 100 m/ })).toBeVisible()
  await expect(follow.getByText(/^Mis à jour/)).toBeVisible()

  // Fin de la balade : « terminée », position effacée, et la page le dit.
  await finishButton(app).click()
  await expect(bravo(app)).toBeVisible()
  await expect.poll(async () => (await serverLive(token!))?.status, { message: 'partage terminé' }).toEqual({ stringValue: 'terminée' })
  expect(await serverLive(token!)).not.toHaveProperty('lat')
  await expect(follow.getByRole('heading', { name: /^Balade terminée à \d+\sh\s\d{2}$/ })).toBeVisible()

  // Un lien coupé : un message calme, pas l'écran de connexion.
  await follow.goto(url.replace(/.{4}$/, ''))
  await expect(follow.getByRole('heading', { name: 'Ce lien ne mène plus à une balade' })).toBeVisible()
  await other.close()
})


// T-086 : « Repère » sur la Live Activity : la position est gardée, puis racontée après la balade.
test('T-086 · Repère sur l’écran verrouillé : « Repère posé », puis « À raconter » remplacé par ce qui s’est passé', async ({ fake, user, app }) => {
  await startWalk(app)
  await fake.walkPoints(app, 12)
  await fake.placeMarker(app)
  await expect(app.getByText('Repère posé')).toBeVisible()
  await fake.walkPoints(app, 12)
  await finishButton(app).click()
  await expect(bravo(app)).toBeVisible()
  await expect(app.getByText('1 repère posé. Que s’est-il passé ?')).toBeVisible()
  await expectServerWalks(user, 1)
  expect(JSON.stringify((await serverWalks(user.uid))[0]?.fields)).toContain('"type":{"stringValue":"araconter"}')

  await app.getByRole('button', { name: 'Raconter la balade' }).click()
  await expect(app.getByText('Repère posé pendant la balade')).toBeVisible()
  await app.getByRole('button', { name: 'Jeu' }).click()
  await expect(app.getByRole('heading', { name: 'C’est raconté !' })).toBeVisible()
  await expect.poll(async () => JSON.stringify((await serverWalks(user.uid))[0]?.fields), { message: 'repère raconté au serveur' }).toContain('"type":{"stringValue":"jeu"}')
  expect(JSON.stringify((await serverWalks(user.uid))[0]?.fields)).not.toContain('araconter')
})

test('T-103 · photos de la balade : ajoutées depuis le récap avec l’accord, puis « Annuler » les retire', async ({ fake, user, app }) => {
  await startWalk(app)
  await fake.walkPoints(app, 24)
  // Une photo de la photothèque prise pendant la balade, une autre la veille (ignorée).
  const data = await app.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 40
    canvas.getContext('2d')!.fillRect(0, 0, 40, 20)
    return canvas.toDataURL('image/jpeg').split(',')[1]!
  })
  const started = Date.parse(fake.walk!.startedAt)
  fake.photos = [
    { data, time: new Date(started + 2 * 60_000).toISOString() },
    { data, time: new Date(started - 86_400_000).toISOString() },
  ]
  await finishButton(app).click()
  await expect(bravo(app)).toBeVisible()
  await app.getByRole('button', { name: 'Ajouter les photos prises pendant la balade' }).click()
  await expect(app.getByText('1 photo de la balade ajoutée')).toBeVisible()
  const photos = async () => (JSON.stringify((await serverWalks(user.uid))[0]?.fields?.photos ?? {}).match(/thumbFileId/g) ?? []).length
  await expect.poll(photos, { timeout: 30_000, message: 'photo ajoutée au serveur' }).toBe(1)
  expect(JSON.stringify((await serverWalks(user.uid))[0]?.fields)).toContain('photosSearchedAt')
  await app.getByRole('button', { name: 'Annuler' }).click()
  await expect(app.getByText('Photos retirées.')).toBeVisible()
  await expect.poll(photos, { timeout: 30_000, message: 'photo retirée au serveur' }).toBe(0)
})

test('T-101 · exercice au parc : après 30 s dans un parc, le bandeau une seule fois ; « Commencer » ouvre la mission, la balade continue', async ({ fake, app }) => {
  fake.parkName = 'Square des Tilleuls'
  await startWalk(app)
  await fake.walkPoints(app, 2)
  const banner = app.getByText(/^Vous êtes au square des Tilleuls\. \d+\u00a0min de «/)
  // Pas avant 30 s.
  await app.waitForTimeout(20_000)
  await expect(banner).toHaveCount(0)
  await expect(banner).toBeVisible({ timeout: 20_000 })
  expect(fake.parkOffered).toBe(true)
  expect(fake.parks).toHaveLength(1)
  await app.getByRole('button', { name: 'Commencer' }).click()
  await expect(app).toHaveURL(/#\/mission\?balade=1/)
  await app.getByRole('button', { name: 'Fermer la mission' }).click()
  await expect(app).toHaveURL(/#\/balade-en-cours/)
  await expect(finishButton(app)).toBeVisible()
  // Une seule fois par balade, même après être revenu sur l’écran.
  await fake.walkPoints(app, 2)
  await app.waitForTimeout(35_000)
  await expect(banner).toHaveCount(0)
  expect(fake.recording).toBe(true)
})
