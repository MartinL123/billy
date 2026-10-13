import { defineConfig } from 'vitest/config'

// Tests des règles Firestore : ils ont besoin de l'émulateur (voir `npm run test:rules`).
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 20000 },
})
