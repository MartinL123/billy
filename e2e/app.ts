import { expect, type BrowserContext, type Page } from '@playwright/test'
import type { TestUser } from './emulator'

/**
 * L'écran d'ouverture (une fois par lancement) n'est pas l'objet de ces tests : on le marque déjà vu dans chaque
 * nouvelle page, pour arriver directement sur l'écran demandé.
 */
export async function skipOpening(context: BrowserContext) {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('billy.ouverture-montree', '1')
    } catch {
      // Sans stockage, l'ouverture s'affiche : les tests le verront.
    }
  })
}

/** La barre d'onglets : l'accueil est affiché, les données sont là. */
export const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' })

/** Se connecter avec un compte de l'émulateur, puis attendre l'accueil (le premier lancement prépare l'espace, en ligne). */
export async function login(page: Page, user: TestUser) {
  await page.goto('./')
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(tabBar(page)).toBeVisible({ timeout: 30_000 })
}

/** Aller à un écran sans recharger la page (utile hors ligne : sans service worker, un rechargement échouerait). */
export async function goHash(page: Page, hash: string) {
  await page.evaluate((h) => {
    window.location.hash = h
  }, hash)
}

/** Depuis l'accueil, « Partir en balade » : l'adresse des boutons de l'accueil et de la carte. */
export async function startWalk(page: Page) {
  await goHash(page, '#/')
  await expect(tabBar(page)).toBeVisible()
  await goHash(page, '#/balade-en-cours?depart=1')
  await expect(page.getByRole('button', { name: 'Terminer' })).toBeEnabled()
}

export const finishButton = (page: Page) => page.getByRole('button', { name: 'Terminer' })
export const bravo = (page: Page) => page.getByRole('heading', { name: 'Belle balade !' })
