const env = import.meta.env

/** `npm run dev:emu` : tout passe par les émulateurs locaux, rien ne touche le vrai projet. */
export const useEmulators = env.VITE_USE_EMULATORS === 'true'

export const firebaseConfig = useEmulators
  ? { apiKey: 'demo', authDomain: 'demo-billy.firebaseapp.com', projectId: 'demo-billy', appId: 'demo' }
  : {
      apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
      projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
      appId: env.VITE_FIREBASE_APP_ID as string | undefined,
    }

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
