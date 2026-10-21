import { defineConfig, devices } from '@playwright/test'

// T-063 : tests de bout en bout de la balade (protocole de casse, docs/profondeur/03-protocole-casse.md).
// WebKit, iPhone 390 × 844, faux pont iOS (e2e/fakeIphone.ts), émulateurs Firebase. Voir e2e/README.md.
const PORT = 4179

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  // Chaque test a son propre compte, mais un seul émulateur : pas de parallélisme, des résultats lisibles.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['iPhone 13'],
    browserName: 'webkit',
    viewport: { width: 390, height: 844 },
    baseURL: `http://127.0.0.1:${PORT}/billy/`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    // Le service worker (mise à jour automatique) rechargerait la page au milieu d'un test.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'webkit-iphone' }],
  webServer: {
    // Un build branché sur les émulateurs, dans son propre dossier (dist reste celui de la production).
    command: `VITE_USE_EMULATORS=true npx vite build --outDir .e2e-dist --emptyOutDir && npx vite preview --outDir .e2e-dist --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/billy/`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
