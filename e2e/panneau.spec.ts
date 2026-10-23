import { test, expect, type Page } from '@playwright/test'
import { bravo, finishButton, goHash, login, skipOpening, startWalk } from './app'
import { newUser, seedProfile, serverWalks } from './emulator'
import { FakeIphone } from './fakeIphone'

// R-099 : le panneau de la carte des Balades et sa liste se partagent le geste du doigt, dans le même geste.
// Les touchers sont synthétiques (TouchEvent) : WebKit ne fait pas défiler la liste de lui-même avec eux, on vérifie
// donc qui prend chaque mouvement (le panneau bouge-t-il, le défilement est-il empêché ?). Le vrai défilement d'iOS et
// son élan restent à essayer sur l'iPhone.

const JOURNAL = 'Son journal'
const panel = (page: Page, label = JOURNAL) => page.locator(`section[aria-label="${label}"]`)

/** La position du panneau (translateY) et le défilement de sa liste. */
async function state(page: Page, label = JOURNAL) {
  return panel(page, label).evaluate((el) => {
    const t = getComputedStyle(el).transform
    const body = el.querySelector<HTMLElement>('.overscroll-contain')!
    return { y: t && t !== 'none' ? new DOMMatrix(t).m42 : 0, scrollTop: body.scrollTop }
  })
}

/** Un glissé du doigt de `from` à `to` (y, en px dans l'écran), à x = 195 ; rend les mouvements empêchés et la position à mi-chemin. */
async function swipe(page: Page, from: number, to: number, steps = 12, label = JOURNAL) {
  return page.evaluate(
    async ({ from, to, steps, label }) => {
      const target = document.elementFromPoint(195, from)!
      // WebKit sur ordinateur refuse `new Touch()` : un évènement ordinaire avec les mêmes listes de doigts.
      const fire = (type: string, y: number) => {
        const t = { identifier: 7, target, clientX: 195, clientY: y, pageX: 195, pageY: y }
        const event = new Event(type, { bubbles: true, cancelable: true })
        const list = (items: (typeof t)[]) => Object.assign(items, { item: (i: number) => items[i] ?? null })
        Object.defineProperties(event, {
          touches: { value: list(type === 'touchend' ? [] : [t]) },
          changedTouches: { value: list([t]) },
        })
        target.dispatchEvent(event)
        return event.defaultPrevented
      }
      const wait = () => new Promise((r) => setTimeout(r, 16))
      fire('touchstart', from)
      const prevented: boolean[] = []
      let middle = 0
      for (let i = 1; i <= steps; i++) {
        await wait()
        prevented.push(fire('touchmove', from + ((to - from) * i) / steps))
        if (i === Math.round(steps / 2)) {
          const el = document.querySelector<HTMLElement>(`section[aria-label="${label}"]`)!
          middle = new DOMMatrix(getComputedStyle(el).transform).m42
        }
      }
      await wait()
      const endPrevented = fire('touchend', to)
      return { prevented, middle, endPrevented }
    },
    { from, to, steps, label },
  )
}

const settle = (page: Page) => page.waitForTimeout(600)

test('R-099 · le panneau et sa liste se partagent le geste du doigt (cran du milieu, haut, réduit, toucher)', async ({ context }) => {
  await skipOpening(context)
  const user = await newUser()
  await seedProfile(user.uid)
  const page = await context.newPage()
  await login(page, user)
  await goHash(page, '#/territoire')
  await expect(panel(page)).toBeVisible()
  // Une longue liste (le contenu ne compte pas ici, seulement sa hauteur).
  await panel(page).evaluate((el) => {
    const filler = document.createElement('div')
    filler.style.height = '2400px'
    el.querySelector('.overscroll-contain')!.appendChild(filler)
  })
  await settle(page)
  const half = (await state(page)).y
  expect(half).toBeGreaterThan(100)
  // Sous le haut du panneau (au-dessus de l'action fixée en bas).
  const grip = (await panel(page).boundingBox())!.y + 60

  // 1. Cran du milieu, le doigt monte : le panneau le suit, le défilement est empêché.
  // (Lentement : 80 px en une demi-seconde, le panneau revient au cran du milieu ; les 2 premiers mouvements, sous 6 px,
  // ne décident encore rien.)
  let r = await swipe(page, grip, grip - 80, 30)
  expect(r.prevented.slice(2).every(Boolean)).toBe(true)
  expect(r.middle).toBeLessThan(half - 20)
  expect(r.endPrevented).toBe(true)
  await settle(page)
  expect((await state(page)).y).toBeCloseTo(half, 0)

  // 2. Du milieu, le doigt monte au-delà du cran haut : le panneau s'arrête en haut, la suite fait défiler la liste.
  r = await swipe(page, grip, grip - half - 200, 24)
  expect(r.prevented.every(Boolean)).toBe(true)
  let s = await state(page)
  expect(s.y).toBe(0)
  expect(s.scrollTop).toBeGreaterThan(120)
  await settle(page)
  s = await state(page)
  expect(s.y).toBe(0)
  await expect(page.getByRole('button', { name: 'Réduire le panneau' })).toBeVisible()

  // 3. Cran haut, liste défilée, le doigt descend : la liste garde le geste (pas empêché), le panneau ne bouge pas.
  r = await swipe(page, 400, 480)
  expect(r.prevented.some(Boolean)).toBe(false)
  expect(r.middle).toBe(0)
  await settle(page)
  expect((await state(page)).y).toBe(0)

  // 4. Cran haut, tout en haut de la liste, le doigt descend : le panneau descend avec lui.
  await panel(page).evaluate((el) => {
    el.querySelector<HTMLElement>('.overscroll-contain')!.scrollTop = 0
  })
  r = await swipe(page, 300, 300 + half + 40, 20)
  expect(r.prevented.every(Boolean)).toBe(true)
  expect(r.middle).toBeGreaterThan(100)
  await settle(page)
  s = await state(page)
  expect(s.y).toBeGreaterThan(half - 2)

  // 5. Réduit, le doigt monte : le panneau le suit.
  const show = page.getByRole('button', { name: 'Afficher le panneau' })
  for (let i = 0; i < 3 && !(await show.isVisible()); i++) {
    await page.getByRole('button', { name: /panneau/ }).click()
    await settle(page)
  }
  await expect(show).toBeVisible()
  const collapsed = (await state(page)).y
  const top = (await panel(page).boundingBox())!.y
  r = await swipe(page, top + 12, top - 88)
  expect(r.prevented.every(Boolean)).toBe(true)
  expect(r.middle).toBeLessThan(collapsed - 20)
  await settle(page)

  // 6. Un toucher (moins de 6 px) : personne ne prend le geste, le « click » qui suit n'est pas empêché.
  const before = await state(page)
  r = await swipe(page, top + 12, top + 15, 3)
  expect(r.prevented.some(Boolean)).toBe(false)
  expect(r.endPrevented).toBe(false)
  expect((await state(page)).y).toBe(before.y)
})

test('R-099 · à la souris (site sur ordinateur), glisser le panneau et sa poignée ne la « touche » pas', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: false, isMobile: false, baseURL: 'http://127.0.0.1:4179/billy/', locale: 'fr-FR', serviceWorkers: 'block' })
  await skipOpening(context)
  const user = await newUser()
  await seedProfile(user.uid)
  const page = await context.newPage()
  await login(page, user)
  await goHash(page, '#/territoire')
  await expect(panel(page)).toBeVisible()
  await settle(page)
  const half = (await state(page)).y
  // Depuis la poignée, vers le haut jusqu'au cran haut : le panneau monte, la poignée n'est pas « touchée » (sinon
  // elle le ferait redescendre au milieu).
  const handle = await page.getByRole('button', { name: 'Agrandir le panneau' }).boundingBox()
  const x = handle!.x + handle!.width / 2
  const y = handle!.y + handle!.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, y - (half * i) / 10)
  await page.mouse.up()
  await settle(page)
  expect((await state(page)).y).toBe(0)
  await expect(page.getByRole('button', { name: 'Réduire le panneau' })).toBeVisible()
  await context.close()
})

// R-102 : le même panneau, le même geste et les mêmes 3 crans dans tous ses modes : la fiche d'une balade (touchée sur
// la carte ou dans le journal) et sa relecture se baissent, se montent et suivent leur poignée comme le journal.
// R-103 : réduite, la fiche descend aussi bas que le journal.
test('R-102 / R-103 · fiche d’une balade et relecture : glisser au cran réduit, au cran haut, et la poignée', async ({ context }) => {
  const fake = new FakeIphone()
  await fake.install(context)
  await skipOpening(context)
  const user = await newUser()
  await seedProfile(user.uid)
  const page = await context.newPage()
  await login(page, user)
  await startWalk(page)
  await fake.walkPoints(page, 24)
  await finishButton(page).click()
  await expect(bravo(page)).toBeVisible()
  await expect.poll(async () => (await serverWalks(user.uid)).length, { timeout: 30_000 }).toBe(1)
  const id = (await serverWalks(user.uid))[0]!.name.split('/').pop()

  // R-103 : le cran réduit du journal, la référence pour la fiche d'une balade.
  await goHash(page, '#/territoire')
  await expect(panel(page)).toBeVisible()
  await settle(page)
  const journalTop = (await panel(page).boundingBox())!.y
  await swipe(page, journalTop + 12, journalTop + 400, 8)
  await settle(page)
  await expect(page.getByRole('button', { name: 'Afficher le panneau' })).toBeVisible()
  const journalLow = (await state(page)).y

  for (const label of ['La balade', 'Revoir la balade']) {
    if (label === 'La balade') {
      await goHash(page, `#/souvenir/${id}`)
      await expect(panel(page, label).getByRole('button', { name: 'Revoir la balade' })).toBeVisible()
    } else {
      await panel(page, 'La balade').getByRole('button', { name: 'Revoir la balade' }).click()
      await expect(panel(page, label).getByRole('button', { name: 'Pause' })).toBeVisible()
    }
    await settle(page)
    const handle = panel(page, label).getByRole('button', { name: /panneau/ })
    // La fiche s'ouvre au cran du milieu, la relecture au cran réduit (R-096) : la poignée donne l'autre.
    let y = (await state(page, label)).y
    if (label === 'La balade') {
      await expect(handle).toHaveAccessibleName('Agrandir le panneau')
    } else {
      await expect(handle).toHaveAccessibleName('Afficher le panneau')
      // Réduit : les vitesses entières au-dessus du rond Accueil.
      const speeds = (await panel(page, label).getByRole('button', { name: '× 4' }).boundingBox())!
      expect(speeds.y + speeds.height).toBeLessThan(844 - 88 - 26)
      await handle.click()
      await settle(page)
      await expect(handle).toHaveAccessibleName('Agrandir le panneau')
    }
    const half = (await state(page, label)).y
    // (Relecture : ouverte au cran réduit, au moins 120 px sous le milieu.)
    if (label !== 'La balade') expect(y).toBeGreaterThanOrEqual(half + 120)

    // Du milieu, le doigt descend : le cran réduit, bien plus bas (au moins 120 px de carte en plus).
    let top = (await panel(page, label).boundingBox())!.y
    let r = await swipe(page, top + 12, top + 160, 8, label)
    expect(r.prevented.slice(1).every(Boolean)).toBe(true)
    await settle(page)
    const collapsed = (await state(page, label)).y
    expect(collapsed).toBeGreaterThanOrEqual(half + 120)
    await expect(handle).toHaveAccessibleName('Afficher le panneau')
    // R-103 : la fiche descend aussi bas que le journal (la relecture garde ses commandes entières, R-096).
    if (label === 'La balade') expect(collapsed).toBeCloseTo(journalLow, 0)
    else expect(collapsed).toBeLessThan(journalLow - 40)

    // Du cran réduit, le doigt monte vite jusqu'en haut : le cran haut.
    top = (await panel(page, label).boundingBox())!.y
    r = await swipe(page, top + 12, top - collapsed + 12, 8, label)
    await settle(page)
    expect((await state(page, label)).y).toBe(0)
    await expect(handle).toHaveAccessibleName('Réduire le panneau')

    // La poignée : haut → milieu → haut.
    await handle.click()
    await settle(page)
    y = (await state(page, label)).y
    expect(y).toBeCloseTo(half, 0)
    await handle.click()
    await settle(page)
    expect((await state(page, label)).y).toBe(0)
  }
})
