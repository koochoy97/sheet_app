import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getAnalytics, isSupported } from 'firebase/analytics'

const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID,
} = import.meta.env

const missingVars = [
  ['VITE_FIREBASE_API_KEY', VITE_FIREBASE_API_KEY],
  ['VITE_FIREBASE_AUTH_DOMAIN', VITE_FIREBASE_AUTH_DOMAIN],
  ['VITE_FIREBASE_PROJECT_ID', VITE_FIREBASE_PROJECT_ID],
  ['VITE_FIREBASE_STORAGE_BUCKET', VITE_FIREBASE_STORAGE_BUCKET],
  ['VITE_FIREBASE_MESSAGING_SENDER_ID', VITE_FIREBASE_MESSAGING_SENDER_ID],
  ['VITE_FIREBASE_APP_ID', VITE_FIREBASE_APP_ID],
].filter(([, value]) => !value)

if (missingVars.length) {
  const list = missingVars.map(([key]) => key).join(', ')
  throw new Error(`[firebase] Faltan variables de entorno: ${list}`)
}

const firebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  projectId: VITE_FIREBASE_PROJECT_ID,
  storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: VITE_FIREBASE_APP_ID,
}

if (VITE_FIREBASE_MEASUREMENT_ID) {
  firebaseConfig.measurementId = VITE_FIREBASE_MEASUREMENT_ID
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(app)
    })
    .catch(() => {})
}

export { app, auth }
