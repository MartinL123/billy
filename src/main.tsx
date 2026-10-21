import { StrictMode } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/figtree'
import '@fontsource-variable/bricolage-grotesque'
import './index.css'
import { isConfigured } from './firebase/config'
import { Splash } from './features/auth/Splash'
import { isNative } from './native'
import { watchFirestoreCrash } from './firebase/recover'
import { textClasses, textLevel } from './lib/textSize'

// Nouvelle version : l’app se recharge seule. Sur iPhone l’app reste ouverte des jours,
// on revérifie donc à chaque retour au premier plan.
// Dans l’app iOS, le site en ligne est chargé tel quel (même app que le navigateur) et garde son service worker ;
// seul le paquet de secours embarqué (adresse capacitor://) n’en a pas.
if (!(isNative() && window.location.protocol === 'capacitor:'))
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

// T-061 : dans l’app iOS, la base locale ne doit pas être purgée par le système (balades en attente d’envoi).
if (isNative()) void navigator.storage?.persist?.().catch(() => undefined)

// R-042 : Firestore en panne après un passage en arrière-plan (iOS) : l’app se recharge à son retour.
watchFirestoreCrash()

// R-056 : le niveau de taille du texte d’iOS, sur <html> (relu au retour au premier plan, quand le réglage a pu changer).
const markTextSize = () => {
  const html = document.documentElement
  html.classList.remove('texte-grand', 'texte-tres-grand')
  html.classList.add(...textClasses(textLevel(parseFloat(getComputedStyle(html).fontSize))))
}
markTextSize()
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && markTextSize())
window.addEventListener('resize', markTextSize)

const root = createRoot(document.getElementById('root')!)

if (isConfigured) {
  // Firebase n’est chargé que s’il est configuré.
  void import('./App').then(({ default: App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
} else {
  root.render(
    <Splash title="Bonjour">
      L’app n’est pas encore reliée à Firebase. Suivez <strong>docs/setup/setup-firebase.md</strong>, puis ajoutez les variables
      <code> VITE_FIREBASE_*</code> dans <code>.env.local</code> et dans les secrets du repo GitHub.
    </Splash>,
  )
}
