import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import {
  firebaseConfig,
  firestoreEmulatorHost,
  firestoreEmulatorPort,
  useFirebaseEmulators,
} from './firebaseEnvironment.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

if (useFirebaseEmulators && !globalThis.__acFirestoreEmulatorConnected) {
  connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);
  globalThis.__acFirestoreEmulatorConnected = true;
}
