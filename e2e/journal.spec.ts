import { test, expect } from '@playwright/test'
import { goHash, login, skipOpening } from './app'
import { FIRESTORE_URL, newUser, seedProfile } from './emulator'

// R-110 : un seul journal, celui de la carte. La tuile « Ses souvenirs » l'ouvre filtré sur « Souvenirs » ; l'ancienne
// adresse `/balades` ouvre la carte, pastille « Balades ».

async function seedSouvenir(uid: string, text: string) {
  const today = new Date().toISOString().slice(0, 10)
  const response = await fetch(`${FIRESTORE_URL}/v1/projects/demo-billy/databases/(default)/documents/users/${uid}/entries?documentId=souvenir-e2e`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { date: { stringValue: today }, text: { stringValue: text }, tags: { arrayValue: {} }, photos: { arrayValue: {} } } }),
  })
  if (!response.ok) throw new Error(`Souvenir de test impossible : ${response.status}`)
}

test('R-110 · la tuile « Ses souvenirs » ouvre le journal filtré', async ({ context }) => {
  await skipOpening(context)
  const user = await newUser()
  await seedProfile(user.uid)
  await seedSouvenir(user.uid, 'Premier bain dans la Seine')
  const page = await context.newPage()
  await login(page, user)

  await page.getByRole('link', { name: /Ses souvenirs/ }).click()
  await expect(page).toHaveURL(/#\/territoire\?voir=souvenirs/)
  const journal = page.locator('section[aria-label="Son journal"]')
  await expect(journal.getByRole('button', { name: 'Souvenirs', pressed: true })).toBeVisible()
  await expect(journal.getByText('Premier bain dans la Seine')).toBeVisible()
})

test('R-110 · `/balades` ouvre la carte, pastille « Balades »', async ({ context }) => {
  await skipOpening(context)
  const user = await newUser()
  await seedProfile(user.uid)
  const page = await context.newPage()
  await login(page, user)
  await goHash(page, '#/balades')
  await expect(page).toHaveURL(/#\/territoire\?voir=balades/)
  await expect(page.locator('section[aria-label="Son journal"]').getByRole('button', { name: 'Balades', pressed: true })).toBeVisible()
})
