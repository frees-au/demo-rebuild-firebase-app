import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import {
  firebaseConfig,
  storageEmulatorHost,
  storageEmulatorPort,
  useFirebaseEmulators,
} from './firebaseEnvironment.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const storage = getStorage(app);

if (useFirebaseEmulators && !globalThis.__acStorageEmulatorConnected) {
  connectStorageEmulator(storage, storageEmulatorHost, storageEmulatorPort);
  globalThis.__acStorageEmulatorConnected = true;
}
