import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig, useEmulators } from './config'

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

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
