import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
} from 'firebase/firestore';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { readable } from 'svelte/store';
import { isAllowedAccountEmail } from './accountPolicy.js';
import {
  authEmulatorOrigin,
  firebaseConfig,
  firestoreEmulatorHost,
  firestoreEmulatorPort,
  functionEndpoint,
  storageEmulatorHost,
  storageEmulatorPort,
  useFirebaseEmulators,
} from './firebaseEnvironment.js';

export {
  authEmulatorOrigin,
  firebaseConfig,
  firestoreEmulatorHost,
  firestoreEmulatorPort,
  storageEmulatorHost,
  storageEmulatorPort,
  useFirebaseEmulators,
} from './firebaseEnvironment.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const provider = new GoogleAuthProvider();

let emulatorConnected = false;

provider.setCustomParameters({
  prompt: 'select_account',
});

if (useFirebaseEmulators && !emulatorConnected && !auth.emulatorConfig) {
  connectAuthEmulator(auth, authEmulatorOrigin, { disableWarnings: true });
  emulatorConnected = true;
}

if (useFirebaseEmulators && !globalThis.__acFirestoreEmulatorConnected) {
  connectFirestoreEmulator(firestore, firestoreEmulatorHost, firestoreEmulatorPort);
  globalThis.__acFirestoreEmulatorConnected = true;
}

setPersistence(auth, browserLocalPersistence);

export const authState = readable({ ready: false, user: null }, (set) => {
  let active = true;

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      set({ ready: true, user: null });
      return;
    }

    try {
      const token = await user.getIdTokenResult();
      const profileState = await loadSignedInProfileState(user.uid);
      if (!active) return;
      set({ ready: true, user: withAccountClaims(user, token.claims, profileState) });
    } catch {
      if (!active) return;
      set({ ready: true, user: withAccountClaims(user, {}, { hasProfile: false, onboarded: false }) });
    }
  });

  return () => {
    active = false;
    unsubscribe();
  };
});

async function loadSignedInProfileState(uid) {
  const snapshot = await getDoc(doc(firestore, 'userProfiles', uid));

  return {
    hasProfile: snapshot.exists(),
    onboarded: snapshot.exists() && snapshot.data()?.onboarded === true,
  };
}

export function accountEndpoint() {
  return functionEndpoint('account');
}

export async function onboardCurrentUser(profile) {
  if (!auth.currentUser) {
    throw new Error('Sign in before onboarding.');
  }

  const token = await auth.currentUser.getIdToken();
  const response = await fetch(accountEndpoint(), {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'onboard', profile }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Account could not be prepared.');
  }

  return payload.profile || null;
}

export function isAllowedEmail(email) {
  return isAllowedAccountEmail(email);
}

function roleFromClaims(claims) {
  return String(claims?.role || '').trim().toLowerCase();
}

function withAccountClaims(user, claims, profileState = {}) {
  const role = roleFromClaims(claims);

  return Object.assign(user, {
    acClaims: {
      role,
      admin: role === 'admin',
      manager: role === 'manager',
      onboarded: profileState.onboarded === true,
      hasProfile: profileState.hasProfile === true,
    },
  });
}

export async function refreshCurrentUserClaims() {
  if (!auth.currentUser) return null;
  const token = await auth.currentUser.getIdTokenResult(true);
  const profileState = await loadSignedInProfileState(auth.currentUser.uid);
  return withAccountClaims(auth.currentUser, token.claims, profileState);
}

export function isAdmin(user = auth.currentUser) {
  return Boolean(user?.acClaims?.admin);
}

export function isManager(user = auth.currentUser) {
  return Boolean(user?.acClaims?.manager);
}

export function canUseAdminPages(user = auth.currentUser) {
  return isAdmin(user) || isManager(user);
}

export async function getCurrentUserToken() {
  if (!auth.currentUser) {
    throw new Error('Sign in before loading employees.');
  }

  return auth.currentUser.getIdToken();
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);

  if (!isAllowedEmail(result.user.email)) {
    await signOut(auth);
    throw Object.assign(new Error('Email domain is not allowed.'), { code: 'app/domain-not-allowed' });
  }

  return result.user;
}

export async function signInWithEmail(email, password) {
  if (!isAllowedEmail(email)) {
    throw Object.assign(new Error('Email domain is not allowed.'), { code: 'app/domain-not-allowed' });
  }

  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function sendPasswordResetEmail(email) {
  if (!isAllowedEmail(email)) {
    throw Object.assign(new Error('Email domain is not allowed.'), { code: 'app/domain-not-allowed' });
  }

  await firebaseSendPasswordResetEmail(auth, String(email || '').trim());
}

export function getAuthErrorMessage(error, method = 'sign-in') {
  if (error?.code === 'auth/unauthorized-domain') {
    return `${window.location.hostname} is not authorized for Google sign-in in Firebase.`;
  }

  if (error?.code === 'app/domain-not-allowed') {
    // Get this from Firebase Console > Authentication > Settings > Authorized domains.
    return 'Use an UPDATE_ME account.';
  }

  if (
    error?.code === 'auth/invalid-credential'
    || error?.code === 'auth/user-not-found'
    || error?.code === 'auth/wrong-password'
  ) {
    return 'Email or password was not accepted.';
  }

  if (error?.code === 'auth/too-many-requests') {
    return 'Too many attempts. Try again later.';
  }

  return `${method} was not completed. Try again.`;
}

export async function logOut() {
  await signOut(auth);
}
