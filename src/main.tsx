import { StrictMode } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/figtree'
import '@fontsource-variable/bricolage-grotesque'
import './index.css'
import { isConfigured } from './firebase/config'
import { Splash } from './features/auth/Splash'

// Nouvelle version : l'app se recharge seule. Sur iPhone l'app reste ouverte des jours,
// on revérifie donc à chaque retour au premier plan.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', check)
    setInterval(check, 60 * 60 * 1000)
  },
})

const root = createRoot(document.getElementById('root')!)

if (isConfigured) {
  // Firebase n'est chargé que s'il est configuré.
  void import('./App').then(({ default: App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
} else {
  root.render(
    <Splash title="Bonjour Billy">
      L'app n'est pas encore reliée à Firebase. Suis <strong>docs/setup-firebase.md</strong>, puis ajoute les variables
      <code> VITE_FIREBASE_*</code> dans <code>.env.local</code> et dans les secrets du repo GitHub.
    </Splash>,
  )
}
