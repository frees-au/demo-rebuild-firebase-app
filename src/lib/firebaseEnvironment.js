const localHostnames = ['localhost', '127.0.0.1', '::1'];
const viteDevPorts = ['5173', '5174'];
const hostingEmulatorPorts = ['5002'];
const env = import.meta.env || {};

export const functionsRegion = 'southamerica-east1';

function envValue(key, fallback) {
  const value = env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function envFlag(key, fallback = false) {
  const value = env[key];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

const isLocalHost = localHostnames.includes(window.location.hostname);

export const firebaseConfig = {
  // Get this from Firebase Console > Project settings > General > Web API Key.
  apiKey: envValue('VITE_FIREBASE_API_KEY', 'UPDATE_ME'),
  // Get this from Firebase Console > Project settings > General > Your apps > App ID.
  appId: envValue('VITE_FIREBASE_APP_ID', 'UPDATE_ME'),
  // Get this from Firebase Console > Authentication > Settings > Authorized domains.
  authDomain: envValue('VITE_FIREBASE_AUTH_DOMAIN', 'UPDATE_ME'),
  // Get this from Firebase Console > Project settings > General > Project number.
  messagingSenderId: envValue('VITE_FIREBASE_MESSAGING_SENDER_ID', 'UPDATE_ME'),
  // Get this from Firebase Console > Project settings > General > Project ID.
  projectId: envValue('VITE_FIREBASE_PROJECT_ID', 'UPDATE_ME'),
  // Get this from Firebase Console > Project settings > General > Default Cloud Storage bucket.
  storageBucket: envValue('VITE_FIREBASE_STORAGE_BUCKET', 'UPDATE_ME'),
};

export const authEmulatorOrigin = envValue(
  'VITE_FIREBASE_AUTH_EMULATOR_ORIGIN',
  isLocalHost ? `${window.location.protocol}//${window.location.hostname}:9099` : 'http://localhost:9099',
);

export const functionsEmulatorOrigin = envValue(
  'VITE_FIREBASE_FUNCTIONS_EMULATOR_ORIGIN',
  isLocalHost ? `${window.location.protocol}//${window.location.hostname}:5001` : 'http://localhost:5001',
);

export const firestoreEmulatorHost = envValue(
  'VITE_FIREBASE_FIRESTORE_EMULATOR_HOST',
  isLocalHost ? window.location.hostname : 'localhost',
);

export const firestoreEmulatorPort = Number(envValue('VITE_FIREBASE_FIRESTORE_EMULATOR_PORT', '8080'));

export const storageEmulatorHost = envValue(
  'VITE_FIREBASE_STORAGE_EMULATOR_HOST',
  isLocalHost ? window.location.hostname : 'localhost',
);

export const storageEmulatorPort = Number(envValue('VITE_FIREBASE_STORAGE_EMULATOR_PORT', '9199'));

export const useFirebaseEmulators = envFlag(
  'VITE_USE_FIREBASE_EMULATORS',
  isLocalHost,
);

export function functionEndpoint(functionName, { directOnEmulator = false } = {}) {
  const isViteDevServer = viteDevPorts.includes(window.location.port);
  const isHostingEmulator = hostingEmulatorPorts.includes(window.location.port);

  if (useFirebaseEmulators && (isViteDevServer || (directOnEmulator && !isHostingEmulator))) {
    return `${functionsEmulatorOrigin}/${firebaseConfig.projectId}/${functionsRegion}/${functionName}`;
  }

  return `/api/${functionName}`;
}
