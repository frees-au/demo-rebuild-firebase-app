import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onRequest } from 'firebase-functions/v2/https';
import {
  functionsRegion,
  isAllowedEmail,
} from './policy.js';

initializeApp();

const localOrigins = new Set([
  'http://localhost:5002',
  'http://127.0.0.1:5002',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]);

function json(response, status, payload) {
  response.status(status).set('Cache-Control', 'no-store').json(payload);
}

function setCors(request, response) {
  const origin = request.get('origin') || '';

  if (!localOrigins.has(origin)) return;

  response
    .set('Access-Control-Allow-Origin', origin)
    .set('Access-Control-Allow-Credentials', 'true')
    .set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    .set('Access-Control-Allow-Methods', 'GET, PATCH, POST, OPTIONS')
    .set('Vary', 'Origin');
}

function isAdmin(decodedToken) {
  return decodedToken.role === 'admin';
}

function isManager(decodedToken) {
  return decodedToken.role === 'manager';
}

async function requireSignedIn(request) {
  const authorization = request.get('authorization') || '';
  const match = authorization.match(/^Bearer (.+)$/);

  if (!match) {
    throw Object.assign(new Error('Sign in before loading employees.'), { status: 401 });
  }

  return verifyIdToken(match[1]);
}

async function verifyIdToken(idToken) {
  if (!idToken) {
    throw Object.assign(new Error('Sign in before loading employees.'), { status: 401 });
  }

  return getAuth().verifyIdToken(idToken);
}

async function requireAllowedAccount(request) {
  const decodedToken = await requireSignedIn(request);

  if (!isAllowedEmail(decodedToken.email)) {
    throw Object.assign(new Error('Use an Aussie Coffee account before continuing.'), { status: 403 });
  }

  return decodedToken;
}

async function requireAdmin(request) {
  const decodedToken = await requireSignedIn(request);

  if (!isAdmin(decodedToken)) {
    throw Object.assign(new Error('Administrator access is required.'), { status: 403 });
  }

  return decodedToken;
}

async function requireAdminOrManager(request) {
  const decodedToken = await requireSignedIn(request);

  requireAdminOrManagerToken(decodedToken);

  return decodedToken;
}

function requireAdminOrManagerToken(decodedToken) {
  if (!isAdmin(decodedToken) && !isManager(decodedToken)) {
    throw Object.assign(new Error('You do not have access to employees.'), { status: 403 });
  }
}

function accountClaims(user) {
  const role = String(user.customClaims?.role || '').trim().toLowerCase();

  return {
    role,
    admin: role === 'admin',
    manager: role === 'manager',
  };
}

function employeeCodeFromNumber(number) {
  return `AC-${String(number).padStart(4, '0')}`;
}

function nextEmployeeNumberFromConfig(snapshot) {
  const value = snapshot.exists ? Number(snapshot.data()?.nextEmployeeNumber) : 7;

  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 7;
}

async function reserveEmployeeCode(transaction, firestore) {
  const configRef = firestore.doc('app/appConfig');

  const configSnapshot = await transaction.get(configRef);
  let nextNumber = nextEmployeeNumberFromConfig(configSnapshot);
  let employeeCode = employeeCodeFromNumber(nextNumber);
  let profileSnapshot = await transaction.get(
    firestore.collection('userProfiles').where('employeeCode', '==', employeeCode).limit(1),
  );

  while (!profileSnapshot.empty) {
    nextNumber += 1;
    employeeCode = employeeCodeFromNumber(nextNumber);
    profileSnapshot = await transaction.get(
      firestore.collection('userProfiles').where('employeeCode', '==', employeeCode).limit(1),
    );
  }

  transaction.set(configRef, { nextEmployeeNumber: nextNumber + 1 }, { merge: true });

  return employeeCode;
}

function cleanText(value) {
  return String(value || '').trim();
}

function cleanEmail(value) {
  return cleanText(value).toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function onboardingProfileBody(body) {
  const profile = body && typeof body.profile === 'object' ? body.profile : {};

  return {
    givenNames: cleanText(profile.givenNames),
    surname: cleanText(profile.surname),
    preferredName: cleanText(profile.preferredName),
    portraitPath: cleanText(profile.portraitPath),
  };
}

async function onboardAccount(request) {
  const decodedToken = await requireAllowedAccount(request);
  const body = await readJsonBody(request);
  const profileBody = onboardingProfileBody(body);

  if (!profileBody.givenNames || !profileBody.surname) {
    throw Object.assign(new Error('First and last name are required.'), { status: 400 });
  }

  if (
    profileBody.portraitPath
    && !profileBody.portraitPath.match(new RegExp(`^userPortraits/${escapeRegExp(decodedToken.uid)}\\.[A-Za-z0-9]+$`))
  ) {
    throw Object.assign(new Error('Portrait path is not valid for this account.'), { status: 400 });
  }

  const firestore = getFirestore();
  const profileRef = firestore.collection('userProfiles').doc(decodedToken.uid);

  return firestore.runTransaction(async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);

    if (profileSnapshot.exists && profileSnapshot.data()?.onboarded === true) {
      return {
        profileId: decodedToken.uid,
        ...profileSnapshot.data(),
      };
    }

    const employeeCode = cleanText(profileSnapshot.data()?.employeeCode) || await reserveEmployeeCode(transaction, firestore);
    const profile = {
      ...profileBody,
      employeeCode,
      onboarded: true,
      status: true,
      localTimezone: 'America/Sao_Paulo',
      preferredLanguage: 'en',
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.set(profileRef, profile, { merge: true });

    return {
      profileId: decodedToken.uid,
      ...profile,
    };
  });
}

async function loadUserProfileDirectory() {
  const snapshot = await getFirestore().collection('userProfiles').get();

  return snapshot.docs.reduce((profiles, document) => {
    profiles.set(document.id, document.data());
    return profiles;
  }, new Map());
}

function profileDisplayName(profile) {
  const names = [
    profile.preferredName,
    [profile.givenNames, profile.surname].filter(Boolean).join(' '),
  ];

  return names.map((name) => String(name || '').trim()).find(Boolean) || '';
}

async function listAllUsers(nextPageToken, employees = [], profiles = null) {
  const profileDirectory = profiles || await loadUserProfileDirectory();
  const result = await getAuth().listUsers(1000, nextPageToken);

  employees.push(
    ...result.users.map((user) => {
      const profile = profileDirectory.get(user.uid) || {};

      return {
        uid: user.uid,
        displayName: profileDisplayName(profile) || user.displayName || '',
        email: user.email || '',
        emailVerified: Boolean(user.emailVerified),
        employeeCode: String(profile.employeeCode || '').trim(),
        onboarded: profile.onboarded === true,
        claims: accountClaims(user),
      };
    }),
  );

  if (result.pageToken) {
    return listAllUsers(result.pageToken, employees, profileDirectory);
  }

  return employees.sort((a, b) => {
    const aLabel = a.displayName || a.email;
    const bLabel = b.displayName || b.email;
    return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
  });
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === 'string') {
    try {
      return request.body ? JSON.parse(request.body) : {};
    } catch (error) {
      throw Object.assign(error, { status: 400, message: 'Request body must be valid JSON.' });
    }
  }
  if (Buffer.isBuffer(request.body)) {
    try {
      return request.body.length ? JSON.parse(request.body.toString('utf8')) : {};
    } catch (error) {
      throw Object.assign(error, { status: 400, message: 'Request body must be valid JSON.' });
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      raw += chunk;
    });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(Object.assign(error, { status: 400, message: 'Request body must be valid JSON.' }));
      }
    });
    request.on('error', reject);
  });
}

async function readAppConfig() {
  const snapshot = await getFirestore().doc('app/appConfig').get();
  return snapshot.exists ? snapshot.data() || {} : {};
}

function publicAppConfig(config = {}) {
  return {
    kioskLockSeconds: config.kioskLockSeconds ?? null,
    nextEmployeeNumber: config.nextEmployeeNumber ?? 7,
    timezone: cleanText(config.timezone) || 'America/Sao_Paulo',
    defaultLanguage: cleanText(config.defaultLanguage) || 'en',
    themeColors: config.themeColors && typeof config.themeColors === 'object' ? config.themeColors : {},
  };
}

function normalizeNullablePositiveInteger(value) {
  if (value === null || value === '') return null;

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw Object.assign(new Error('Use a positive number.'), { status: 400 });
  }

  return Math.floor(number);
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
}

function normalizeThemeColors(colors = {}) {
  const allowedFields = new Set(['paper', 'paperHard', 'ink', 'inkSoft', 'line', 'red', 'redDark', 'redWash', 'steel']);
  const normalized = {};

  for (const [key, value] of Object.entries(colors)) {
    if (!allowedFields.has(key)) {
      throw Object.assign(new Error('Theme color is not supported.'), { status: 400 });
    }

    const color = cleanText(value);
    if (!color) continue;
    if (!color.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)) {
      throw Object.assign(new Error('Theme colors must be hex values.'), { status: 400 });
    }

    normalized[key] = color.toLowerCase();
  }

  return normalized;
}

function normalizeAppConfigPatch(config = {}) {
  const patch = {};

  if ('kioskLockSeconds' in config) {
    patch.kioskLockSeconds = normalizeNullablePositiveInteger(config.kioskLockSeconds);
  }

  if ('nextEmployeeNumber' in config) {
    patch.nextEmployeeNumber = normalizePositiveInteger(config.nextEmployeeNumber, 7);
  }

  if ('timezone' in config) {
    const timezone = cleanText(config.timezone);
    if (!['America/Sao_Paulo', 'Australia/Melbourne'].includes(timezone)) {
      throw Object.assign(new Error('Choose a supported timezone.'), { status: 400 });
    }
    patch.timezone = timezone;
  }

  if ('defaultLanguage' in config) {
    const language = cleanText(config.defaultLanguage);
    if (language !== 'en') {
      throw Object.assign(new Error('Choose a supported language.'), { status: 400 });
    }
    patch.defaultLanguage = language;
  }

  if ('themeColors' in config) {
    patch.themeColors = normalizeThemeColors(config.themeColors);
  }

  return patch;
}

async function loadPublicAppConfig() {
  return publicAppConfig(await readAppConfig());
}

async function savePublicAppConfig(request) {
  await requireAdmin(request);

  const body = await readJsonBody(request);
  const config = body && typeof body.config === 'object' ? body.config : {};
  const patch = normalizeAppConfigPatch(config);

  if (Object.keys(patch).length) {
    await getFirestore().doc('app/appConfig').set(patch, { merge: true });
  }

  return loadPublicAppConfig();
}

function normalizeAccountRole(role) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (normalizedRole === 'administrator') return 'admin';
  if (['user', 'manager', 'admin'].includes(normalizedRole)) return normalizedRole;

  throw Object.assign(new Error('Choose a role before saving the account.'), { status: 400 });
}

function employeeProfileBody(body) {
  const profile = body && typeof body.profile === 'object' ? body.profile : {};

  return {
    givenNames: cleanText(profile.givenNames),
    surname: cleanText(profile.surname),
    preferredName: cleanText(profile.preferredName),
  };
}

function authErrorMessage(error) {
  if (error?.code === 'auth/email-already-exists') return 'That email address is already in use.';
  if (error?.code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (error?.code === 'auth/invalid-password') return 'Password must be at least 6 characters.';
  return error.message || 'Employee account could not be created.';
}

async function createEmailPasswordEmployee(request) {
  await requireAdmin(request);

  const body = await readJsonBody(request);
  const email = cleanEmail(body.email);
  const password = String(body.password || '');
  const role = normalizeAccountRole(body.role || 'user');
  const profileBody = employeeProfileBody(body);

  if (!email) {
    throw Object.assign(new Error('Enter an email address.'), { status: 400 });
  }

  if (!isAllowedEmail(email)) {
    throw Object.assign(new Error('Use an Aussie Coffee account email.'), { status: 403 });
  }

  if (password.length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters.'), { status: 400 });
  }

  if (!profileBody.givenNames || !profileBody.surname) {
    throw Object.assign(new Error('First and last name are required.'), { status: 400 });
  }

  let createdUser = null;
  let createdProfileRef = null;

  try {
    createdUser = await getAuth().createUser({
      email,
      password,
      displayName: profileDisplayName(profileBody),
      emailVerified: false,
      disabled: false,
    });

    const firestore = getFirestore();
    const profileRef = firestore.collection('userProfiles').doc(createdUser.uid);
    createdProfileRef = profileRef;
    const profile = await firestore.runTransaction(async (transaction) => {
      const employeeCode = await reserveEmployeeCode(transaction, firestore);
      const nextProfile = {
        ...profileBody,
        employeeCode,
        onboarded: true,
        status: true,
        localTimezone: 'America/Sao_Paulo',
        preferredLanguage: 'en',
        updatedAt: FieldValue.serverTimestamp(),
      };

      transaction.set(profileRef, nextProfile, { merge: true });
      return nextProfile;
    });

    await getAuth().setCustomUserClaims(createdUser.uid, { role });

    return {
      uid: createdUser.uid,
      displayName: profileDisplayName(profile) || createdUser.displayName || '',
      email: createdUser.email || '',
      emailVerified: Boolean(createdUser.emailVerified),
      employeeCode: String(profile.employeeCode || '').trim(),
      onboarded: profile.onboarded === true,
      claims: {
        role,
        admin: role === 'admin',
        manager: role === 'manager',
      },
    };
  } catch (error) {
    if (createdUser?.uid) {
      await getAuth().deleteUser(createdUser.uid).catch(() => {});
    }
    if (createdProfileRef) {
      await createdProfileRef.delete().catch(() => {});
    }

    throw Object.assign(new Error(authErrorMessage(error)), { status: error.status || 400 });
  }
}

async function setAccountRole(request) {
  await requireAdmin(request);

  const body = await readJsonBody(request);
  const uid = String(body.uid || '').trim();

  if (!uid) {
    throw Object.assign(new Error('Choose a user before saving the account role.'), { status: 400 });
  }

  const existingUser = await getAuth().getUser(uid);
  const role = normalizeAccountRole(body.role);

  await getAuth().setCustomUserClaims(uid, { ...existingUser.customClaims, role });

  const updatedUser = await getAuth().getUser(uid);
  const profile = (await getFirestore().collection('userProfiles').doc(uid).get()).data() || {};
  return {
    uid: updatedUser.uid,
    displayName: profileDisplayName(profile) || updatedUser.displayName || '',
    email: updatedUser.email || '',
    emailVerified: Boolean(updatedUser.emailVerified),
    employeeCode: String(profile.employeeCode || '').trim(),
    onboarded: profile.onboarded === true,
    claims: accountClaims(updatedUser),
  };
}

function normalizeDocumentPath(path) {
  const documentPath = String(path || '').trim().replace(/^\/+|\/+$/g, '');
  const parts = documentPath.split('/').filter(Boolean);

  if (!documentPath || parts.length % 2 !== 0) {
    throw Object.assign(new Error('Enter a Firestore document path like collection/document.'), { status: 400 });
  }

  if (parts.some((part) => part === '.' || part === '..')) {
    throw Object.assign(new Error('Firestore document path contains an invalid segment.'), { status: 400 });
  }

  return parts.join('/');
}

async function deleteFirestoreDocument(body) {
  const documentPath = normalizeDocumentPath(body.path);
  const confirmation = String(body.confirmation || '').trim();
  const recursive = Boolean(body.recursive);

  if (confirmation !== documentPath) {
    throw Object.assign(new Error('Confirmation must match the document path.'), { status: 400 });
  }

  const firestore = getFirestore();
  const documentRef = firestore.doc(documentPath);
  const snapshot = await documentRef.get();

  if (!snapshot.exists) {
    throw Object.assign(new Error('Firestore document was not found.'), { status: 404 });
  }

  if (recursive) {
    await firestore.recursiveDelete(documentRef);
  } else {
    await documentRef.delete();
  }

  return {
    path: documentPath,
    recursive,
  };
}

function normalizePin(pin) {
  return String(pin || '').trim();
}

const kioskSessionCookieName = 'ac_kiosk_session';
const kioskSessionDurationMs = 12 * 60 * 60 * 1000;

function isSecureRequest(request) {
  return request.secure || request.get('x-forwarded-proto') === 'https';
}

function kioskCookieOptions(request, maxAgeSeconds) {
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    isSecureRequest(request) ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function clearKioskSessionCookie(request, response) {
  response.set('Set-Cookie', `${kioskSessionCookieName}=; ${kioskCookieOptions(request, 0)}`);
}

function cookieValue(request, name) {
  const cookies = String(request.get('cookie') || '').split(/;\s*/);
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : '';
}

async function startKioskSession(request, response, body) {
  const idToken = String(body.idToken || '').trim();
  const decodedToken = await verifyIdToken(idToken);
  requireAdminOrManagerToken(decodedToken);
  const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn: kioskSessionDurationMs });

  response.set('Set-Cookie', `${kioskSessionCookieName}=${encodeURIComponent(sessionCookie)}; ${kioskCookieOptions(request, Math.floor(kioskSessionDurationMs / 1000))}`);

  return {
    uid: decodedToken.uid,
    role: decodedToken.role,
    expiresIn: kioskSessionDurationMs,
  };
}

async function requireKioskSession(request) {
  const sessionCookie = cookieValue(request, kioskSessionCookieName);

  if (!sessionCookie) {
    throw Object.assign(new Error('Full login is required.'), { status: 401, clearKioskSession: true });
  }

  try {
    const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);

    if (!isAdmin(decodedToken) && !isManager(decodedToken)) {
      throw Object.assign(new Error('Kiosk access is not available for this account.'), { status: 403 });
    }

    return decodedToken;
  } catch (error) {
    throw Object.assign(error, {
      status: error.status || 401,
      clearKioskSession: true,
      message: error.message || 'Full login is required.',
    });
  }
}

function kioskDisplayName(profile) {
  return profileDisplayName(profile) || 'Matched user';
}

function kioskInitials(displayName) {
  return String(displayName || 'AC')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

async function listKioskEmployees() {
  const snapshot = await getFirestore()
    .collection('userProfiles')
    .where('status', '==', true)
    .get();

  return snapshot.docs
    .map((document) => {
      const profile = document.data();
      const displayName = kioskDisplayName(profile);

      return {
        profileId: document.id,
        employeeCode: String(profile.employeeCode || '').trim(),
        displayName,
        initials: kioskInitials(displayName),
        portraitPath: String(profile.portraitPath || '').trim(),
      };
    })
    .filter((employee) => employee.employeeCode)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));
}

async function sendKioskPortrait(request, response) {
  const portraitPath = String(request.query.portrait || '').trim();

  if (!portraitPath.match(/^userPortraits\/[^/]+\.[A-Za-z0-9]+$/)) {
    json(response, 400, { error: 'Portrait path is not valid.' });
    return;
  }

  const [buffer] = await getStorage().bucket(storageBucketName()).file(portraitPath).download();
  const contentType = portraitPath.toLowerCase().endsWith('.png')
    ? 'image/png'
    : portraitPath.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  response
    .status(200)
    .set('Cache-Control', 'private, max-age=300')
    .set('Content-Type', contentType)
    .send(buffer);
}

function storageBucketName() {
  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
    if (firebaseConfig.storageBucket) return firebaseConfig.storageBucket;
  } catch {
    // Fall through to the project-derived emulator bucket name.
  }

  // Get this from Firebase Console > Project settings > General > Project ID.
  return `${process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'UPDATE_ME'}.firebasestorage.app`;
}

async function matchKioskPin(body) {
  const employeeCode = String(body.employeeCode || '').trim();
  const pin = normalizePin(body.pin);
  const attendanceAction = String(body.attendanceAction || 'check-in').trim();

  if (!employeeCode.match(/^[A-Za-z0-9-]+$/)) {
    throw Object.assign(new Error('Choose your photo first.'), { status: 400 });
  }

  if (!pin.match(/^\d{4,8}$/)) {
    throw Object.assign(new Error('PIN should be 4 characters.'), { status: 400 });
  }

  if (!['check-in', 'check-out'].includes(attendanceAction)) {
    throw Object.assign(new Error('Choose check-in or check-out.'), { status: 400 });
  }

  const firestore = getFirestore();
  const document = await firestore
    .collection('userProfiles')
    .where('employeeCode', '==', employeeCode)
    .limit(1)
    .get();

  const profileDocument = document.docs[0];

  if (!profileDocument?.exists || profileDocument.data().kioskPin !== pin) {
    throw Object.assign(new Error('PIN was not a match.'), { status: 404 });
  }

  const eventRef = await firestore.collection('events').add({
    dateStart: FieldValue.serverTimestamp(),
    eventType: attendanceAction,
    userProfile: profileDocument.ref,
    notes: '',
  });

  return {
    profileId: profileDocument.id,
    employeeCode,
    attendanceAction,
    attendanceEventId: eventRef.id,
    displayName: kioskDisplayName(profileDocument.data()),
  };
}

export const employees = onRequest({ region: functionsRegion }, async (request, response) => {
  setCors(request, response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (!['GET', 'PATCH', 'POST'].includes(request.method)) {
    json(response, 405, { error: 'Only GET, PATCH, and POST requests are supported.' });
    return;
  }

  try {
    if (request.method === 'GET') {
      await requireAdminOrManager(request);
      json(response, 200, { employees: await listAllUsers() });
      return;
    }

    if (request.method === 'POST') {
      json(response, 200, { employee: await createEmailPasswordEmployee(request) });
      return;
    }

    json(response, 200, { employee: await setAccountRole(request) });
  } catch (error) {
    json(response, error.status || 500, { error: error.message || 'Employees could not be loaded.' });
  }
});

export const admin = onRequest({ region: functionsRegion }, async (request, response) => {
  setCors(request, response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    json(response, 405, { error: 'Only POST requests are supported.' });
    return;
  }

  try {
    await requireAdmin(request);

    const body = await readJsonBody(request);
    const action = String(body.action || '').trim();

    if (action !== 'deleteFirestoreDocument') {
      json(response, 400, { error: 'Admin action is not supported.' });
      return;
    }

    json(response, 200, { result: await deleteFirestoreDocument(body) });
  } catch (error) {
    json(response, error.status || 500, { error: error.message || 'Admin request was not completed.' });
  }
});

export const appConfig = onRequest({ region: functionsRegion }, async (request, response) => {
  setCors(request, response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (!['GET', 'PATCH', 'POST'].includes(request.method)) {
    json(response, 405, { error: 'Only GET, PATCH, and POST requests are supported.' });
    return;
  }

  try {
    if (request.method === 'GET') {
      json(response, 200, { config: await loadPublicAppConfig() });
      return;
    }

    json(response, 200, { config: await savePublicAppConfig(request) });
  } catch (error) {
    json(response, error.status || 500, { error: error.message || 'App config request was not completed.' });
  }
});

export const account = onRequest({ region: functionsRegion }, async (request, response) => {
  setCors(request, response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    json(response, 405, { error: 'Only POST requests are supported.' });
    return;
  }

  try {
    json(response, 200, { profile: await onboardAccount(request) });
  } catch (error) {
    json(response, error.status || 500, { error: error.message || 'Account could not be prepared.' });
  }
});

export const kiosk = onRequest({ region: functionsRegion }, async (request, response) => {
  setCors(request, response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (!['GET', 'POST'].includes(request.method)) {
    json(response, 405, { error: 'Only GET and POST requests are supported.' });
    return;
  }

  try {
    const body = request.method === 'POST' ? await readJsonBody(request) : {};

    if (request.method === 'POST') {
      if (body.action === 'startKioskMode') {
        json(response, 200, { kioskSession: await startKioskSession(request, response, body) });
        return;
      }
    }

    await requireKioskSession(request);

    if (request.method === 'GET' && request.query.portrait) {
      await sendKioskPortrait(request, response);
      return;
    }

    if (request.method === 'GET') {
      json(response, 200, { employees: await listKioskEmployees() });
      return;
    }

    json(response, 200, { user: await matchKioskPin(body) });
  } catch (error) {
    if (error.clearKioskSession) {
      clearKioskSessionCookie(request, response);
    }
    json(response, error.status || 500, { error: error.message || 'Kiosk request was not completed.' });
  }
});
