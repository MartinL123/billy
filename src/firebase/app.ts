import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import {
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig, useEmulators } from './config'
import { isNative } from '../native'

export const app = initializeApp(firebaseConfig)

// Dans l’app iOS (WebView), getAuth chargerait des outils de connexion par pop-up qui n’y marchent pas :
// on initialise Auth avec la seule persistance IndexedDB. Le web garde getAuth.
export const auth = isNative() ? initializeAuth(app, { persistence: indexedDBLocalPersistence }) : getAuth(app)

// Cache local persistant et illimité : tout reste consultable hors ligne.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentMultipleTabManager(),
  }),
  ignoreUndefinedProperties: true,
})

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
