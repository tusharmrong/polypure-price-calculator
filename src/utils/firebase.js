import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig.js'

let firebaseApp = null
let firebaseAuth = null
let firebaseDb = null
let firebaseInitError = null

try {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
  firebaseAuth = getAuth(firebaseApp)
  firebaseDb = getFirestore(firebaseApp)
} catch (error) {
  firebaseInitError = error
  console.error('Firebase failed to initialize.', error)
}

export { firebaseApp, firebaseAuth, firebaseDb, firebaseInitError }
