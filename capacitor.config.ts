import type { CapacitorConfig } from '@capacitor/cli'

// L'app iOS (Capacitor) : exactement la même app que le site. Elle charge le site en ligne (server.url), donc chaque
// déploiement sur GitHub Pages la met à jour en même temps que le navigateur. Le service worker du site garde tout
// consultable hors ligne (domaine déclaré « App-Bound » dans Info.plist). Le paquet local (`npm run build:ios`) ne sert
// que de secours au tout premier lancement sans réseau.
// Tests au Simulateur (docs/ios.md) : `CAP_DEV_URL=http://127.0.0.1:4173/billy/ npx cap sync ios` charge le site local
// (branché sur les émulateurs) au lieu du site en ligne. Jamais pour l'iPhone.
const devUrl = process.env.CAP_DEV_URL

const config: CapacitorConfig = {
  appId: 'fr.lanrezac.billy',
  // Même nom que APP_NAME (src/appName.ts) : la CLI Capacitor ne sait pas importer ce fichier, il est recopié ici.
  // L'identifiant, lui, ne change jamais.
  appName: 'Flair',
  webDir: 'dist',
  backgroundColor: '#1E5A50',
  server: devUrl
    ? { url: devUrl, cleartext: true }
    : {
        url: 'https://martinl123.github.io/billy/',
        // Le site ne sort jamais de son domaine (liens externes : Safari).
        allowNavigation: ['martinl123.github.io'],
      },
  ios: {
    // Le service worker ne marche dans la WebView que pour les domaines « App-Bound » (WKAppBoundDomains).
    limitsNavigationsToAppBoundDomains: !devUrl,
    // Le contenu passe sous l'encoche et la barre d'accueil : l'app gère déjà env(safe-area-inset-*).
    contentInset: 'never',
  },
}

export default config
