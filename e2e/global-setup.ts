import { AUTH_URL, FIRESTORE_URL } from './emulator'

// Les tests n'écrivent que dans les émulateurs : sans eux, on s'arrête tout de suite avec la marche à suivre.
export default async function globalSetup() {
  for (const url of [FIRESTORE_URL, AUTH_URL]) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(3000) })
    } catch {
      throw new Error(`Émulateur injoignable (${url}). Lancer d'abord « npm run emulators » dans un autre terminal.`)
    }
  }
}
