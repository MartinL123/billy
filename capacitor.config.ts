import type { CapacitorConfig } from '@capacitor/cli'

// L'app iOS (Capacitor) : exactement la même app que le site. Elle charge le site en ligne (server.url), donc chaque
// déploiement sur GitHub Pages la met à jour en même temps que le navigateur. Le service worker du site garde tout
// consultable hors ligne (domaine déclaré « App-Bound » dans Info.plist). Le paquet local (`npm run build:ios`) ne sert
// que de secours au tout premier lancement sans réseau.
const config: CapacitorConfig = {
  appId: 'fr.lanrezac.billy',
  // Même nom que APP_NAME (src/appName.ts) : la CLI Capacitor ne sait pas importer ce fichier, il est recopié ici.
  // L'identifiant, lui, ne change jamais.
  appName: 'Flair',
  webDir: 'dist',
  backgroundColor: '#1E5A50',
  server: {
    url: 'https://martinl123.github.io/billy/',
    // Le site ne sort jamais de son domaine (liens externes : Safari).
    allowNavigation: ['martinl123.github.io'],
  },
  ios: {
    // Le service worker ne marche dans la WebView que pour les domaines « App-Bound » (WKAppBoundDomains).
    limitsNavigationsToAppBoundDomains: true,
    // Le contenu passe sous l'encoche et la barre d'accueil : l'app gère déjà env(safe-area-inset-*).
    contentInset: 'never',
  },
}

export default config
