import type { CapacitorConfig } from '@capacitor/cli'

// L'app iOS (Capacitor) : la même app que le site, empaquetée pour l'iPhone. Le web (GitHub Pages) ne change pas.
// Construire avec `npm run build:ios` (build en chemins relatifs, puis copie dans ios/).
const config: CapacitorConfig = {
  appId: 'fr.lanrezac.billy',
  // Même nom que APP_NAME (src/appName.ts) : la CLI Capacitor ne sait pas importer ce fichier, il est recopié ici.
  // L'identifiant, lui, ne change jamais.
  appName: 'Flair',
  webDir: 'dist',
  backgroundColor: '#1E5A50',
  ios: {
    // Le contenu passe sous l'encoche et la barre d'accueil : l'app gère déjà env(safe-area-inset-*).
    contentInset: 'never',
  },
}

export default config
