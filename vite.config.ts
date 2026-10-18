import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_NAME, APP_TAGLINE } from './src/appName'

// Nom du repo GitHub : l'app est servie sur https://<user>.github.io/billy/
const base = '/billy/'

export default defineConfig({
  base,
  define: {
    // Affichée dans le profil, pour savoir quelle version tourne sur l'iPhone.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  // MapLibre trouve son worker à côté de son propre fichier : en dev, on ne le pré-empaquette pas.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  plugins: [
    // Le nom de l'app dans index.html (titre, nom sur l'écran d'accueil), repris de src/appName.ts.
    { name: 'app-name', transformIndexHtml: (html: string) => html.replaceAll('%APP_NAME%', APP_NAME).replaceAll('%APP_TAGLINE%', APP_TAGLINE) },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_TAGLINE,
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1E5A50',
        background_color: '#F3F5F2',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Rappel du soir : réception du push et ouverture de l'app au toucher (public/push-sw.js).
        importScripts: ['push-sw.js'],
        // Polices et lecteur PDF inclus : tout doit s'afficher hors ligne.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Les tuiles de la carte restent sur l'iPhone : la carte revient vite, et s'affiche même sans réseau (audit R-032).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'server.arcgisonline.com',
            handler: 'CacheFirst',
            options: { cacheName: 'carte-satellite', expiration: { maxEntries: 2500, maxAgeSeconds: 60 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org' && !url.pathname.startsWith('/styles/'),
            handler: 'CacheFirst',
            options: { cacheName: 'carte-plan', expiration: { maxEntries: 2500, maxAgeSeconds: 30 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Le style de la carte : celui en cache tout de suite, la mise à jour en arrière-plan.
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org' && url.pathname.startsWith('/styles/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'carte-style', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
