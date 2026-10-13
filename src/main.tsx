import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/figtree'
import '@fontsource-variable/bricolage-grotesque'
import './index.css'
import { isConfigured } from './firebase/config'
import { Splash } from './features/auth/Splash'

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
