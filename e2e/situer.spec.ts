import { test, expect, type Page } from '@playwright/test'
import { goHash, login, skipOpening } from './app'
import { newUser, seedProfile } from './emulator'

// R-114 : « Me situer » centre la carte sur le point bleu, à chaque toucher, puis le point suit la position (2 min).
// Position simulée par Playwright (navigator.geolocation). Animations réduites : la caméra saute, pas d'attente.

const SAINT_OUEN = { latitude: 48.9116, longitude: 2.3338, accuracy: 25 }
const me = (page: Page) => page.locator('[title="Vous êtes ici"]')

/** Le centre du point bleu, en px dans l'écran. */
async function dotAt(page: Page) {
  const box = (await me(page).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('R-114 · Me situer : la carte se centre sur moi à chaque toucher, le point suit', async ({ context }) => {
  await skipOpening(context)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation(SAINT_OUEN)
  const user = await newUser()
  await seedProfile(user.uid)
  const page = await context.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await login(page, user)
  await goHash(page, '#/territoire')

  const button = page.getByRole('button', { name: 'Me situer', exact: true })
  await button.click()
  await expect(me(page)).toBeVisible()
  // Au centre de la carte, entre les boutons du haut et le panneau (marges 130 / 460 sur 844 px).
  const first = await dotAt(page)
  expect(Math.abs(first.x - 195)).toBeLessThan(12)
  expect(first.y).toBeGreaterThan(150)
  expect(first.y).toBeLessThan(400)

  // La carte déplacée à la main, puis un nouveau toucher : elle revient sur moi, même sans que j'aie bougé.
  await page.mouse.move(195, 250)
  await page.mouse.down()
  await page.mouse.move(60, 120, { steps: 8 })
  await page.mouse.up()
  await expect.poll(async () => (await dotAt(page)).x).toBeLessThan(150)
  await button.click()
  await expect.poll(async () => Math.abs((await dotAt(page)).x - 195)).toBeLessThan(12)

  // Je marche : le point bleu suit (watchPosition, pendant 2 min).
  const before = await dotAt(page)
  await context.setGeolocation({ ...SAINT_OUEN, latitude: SAINT_OUEN.latitude + 0.002 })
  await expect.poll(async () => (await dotAt(page)).y).toBeLessThan(before.y - 20)
})
