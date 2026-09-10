import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, extname, resolve } from 'node:path';
import { normalizeUserProfile } from '../src/lib/userProfileSchema.js';

const envFiles = ['.env.local', '.env'];
const seedRoot = resolve('seeds');
const userProfilesSeedDir = resolve(seedRoot, 'userProfiles');
const eventsSeedDir = resolve(seedRoot, 'events');
const documentsSeedDir = resolve(seedRoot, 'documents');
const userPortraitsSeedDir = resolve(seedRoot, 'userPortraits');
const appConfigSeedPath = resolve(seedRoot, 'app', 'appConfig.json');
const functionsRequire = createRequire(new URL('../functions/package.json', import.meta.url));

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        const rawValue = line.slice(index + 1).trim();
        const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      }),
  );
}

async function loadLocalEnv() {
  for (const file of envFiles) {
    try {
      return parseEnv(await readFile(resolve(file), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  return {};
}

async function postJson(url, body, headers = {}) {
  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      throw new Error(`Firebase emulator is not running at ${new URL(url).origin}.`);
    }

    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error?.message || `Firebase emulator request failed with ${response.status}.`;
    throw Object.assign(new Error(message), { code: message });
  }

  return payload;
}

async function deleteEmulatorData(url) {
  let response;

  try {
    response = await fetch(url, { method: 'DELETE' });
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      throw new Error(`Firebase emulator is not running at ${new URL(url).origin}.`);
    }

    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error?.message || payload.error || `Firebase emulator reset failed with ${response.status}.`;
    throw Object.assign(new Error(message), { code: message });
  }

  return payload;
}

async function authRequest(origin, path, body) {
  return postJson(`${origin}${path}`, body);
}

async function signInLocalAuthUser(origin, seed) {
  return authRequest(origin, '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local', {
    email: seed.email,
    password: seed.password,
    returnSecureToken: true,
  });
}

async function refreshLocalAuthUserPassword(adminAuth, seed) {
  const existingUser = await adminAuth.getUserByEmail(seed.email);
  await adminAuth.updateUser(existingUser.uid, {
    password: seed.password,
    ...(seed.authName ? { displayName: seed.authName } : {}),
  });
}

async function getLocalAuthUser(origin, seed, adminAuth) {
  let account;

  try {
    account = await authRequest(origin, '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local', {
      email: seed.email,
      password: seed.password,
      displayName: seed.authName,
      returnSecureToken: true,
    });
  } catch (error) {
    if (error.code !== 'EMAIL_EXISTS') throw error;

    try {
      account = await signInLocalAuthUser(origin, seed);
    } catch (signInError) {
      if (signInError.code !== 'INVALID_PASSWORD') throw signInError;

      await refreshLocalAuthUserPassword(adminAuth, seed);
      account = await signInLocalAuthUser(origin, seed);
    }
  }

  if (seed.authName) {
    await authRequest(origin, '/identitytoolkit.googleapis.com/v1/accounts:update?key=local', {
      idToken: account.idToken,
      displayName: seed.authName,
      returnSecureToken: false,
    });
  }

  return account;
}

function firestoreCommitUrl(origin, projectId) {
  const encodedDatabase = encodeURIComponent('(default)');
  return `${origin}/v1/projects/${projectId}/databases/${encodedDatabase}/documents:commit`;
}

function firestoreDocumentName(projectId, collection, documentId) {
  return `projects/${projectId}/databases/(default)/documents/${collection}/${documentId}`;
}

function firestoreDocumentPath(projectId, path) {
  return `projects/${projectId}/databases/(default)/documents/${path}`;
}

function authEmulatorHost(origin) {
  return new URL(origin).host;
}

async function getAdminAuth(projectId, authOrigin) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost(authOrigin);
  process.env.GCLOUD_PROJECT = projectId;

  const { getApps, initializeApp } = functionsRequire('firebase-admin/app');
  const { getAuth } = functionsRequire('firebase-admin/auth');

  const app = getApps().length ? getApps()[0] : initializeApp({ projectId });
  return getAuth(app);
}

async function getAdminStorage(projectId, storageOrigin) {
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = new URL(storageOrigin).host;
  process.env.GCLOUD_PROJECT = projectId;

  const { getApps, initializeApp } = functionsRequire('firebase-admin/app');
  const { getStorage } = functionsRequire('firebase-admin/storage');

  const app = getApps().length ? getApps()[0] : initializeApp({ projectId });
  return getStorage(app);
}

async function getAdminFirestore(projectId, firestoreOrigin) {
  process.env.FIRESTORE_EMULATOR_HOST = new URL(firestoreOrigin).host;
  process.env.GCLOUD_PROJECT = projectId;

  const { getApps, initializeApp } = functionsRequire('firebase-admin/app');
  const { getFirestore } = functionsRequire('firebase-admin/firestore');

  const app = getApps().length ? getApps()[0] : initializeApp({ projectId });
  return getFirestore(app);
}

async function resetAuthEmulator(origin, projectId) {
  await deleteEmulatorData(`${origin}/emulator/v1/projects/${projectId}/accounts`);
}

async function resetFirestoreEmulator(origin, projectId) {
  const encodedDatabase = encodeURIComponent('(default)');
  await deleteEmulatorData(`${origin}/emulator/v1/projects/${projectId}/databases/${encodedDatabase}/documents`);
}

async function resetStorageEmulator(bucketName, storage) {
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles();

  await Promise.all(files.map((file) => file.delete()));
}

async function resetEmulatorData({ authOrigin, projectId, firestoreOrigin, storageBucket, storage }) {
  await resetAuthEmulator(authOrigin, projectId);
  console.log('Reset local Auth emulator data');

  await resetFirestoreEmulator(firestoreOrigin, projectId);
  console.log('Reset local Firestore emulator data');

  await resetStorageEmulator(storageBucket, storage);
  console.log('Reset local Storage emulator data');
}

function firestoreReferenceValue(projectId, path) {
  const referencePath = String(path || '').trim();

  if (!referencePath.match(/^[^/]+\/[^/]+(\/[^/]+\/[^/]+)*$/)) {
    throw new Error(`Firestore reference seed value "${referencePath}" must use collection/document path segments.`);
  }

  return { referenceValue: firestoreDocumentPath(projectId, referencePath) };
}

function firestoreValue(value, projectId) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(Math.trunc(value)) };
  if (value && typeof value === 'object' && value.__reference) {
    return firestoreReferenceValue(projectId, value.__reference);
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => firestoreValue(item, projectId)),
      },
    };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [key, firestoreValue(nestedValue, projectId)]),
        ),
      },
    };
  }

  return { stringValue: String(value) };
}

function parseSeedTimestamp(value, fieldName) {
  if (value === null || value === '') return null;
  if (value instanceof Date) return value;

  const normalized = String(value)
    .replace(/\sat\s/i, ' ')
    .replace(/\sUTC([+-])(\d{1,2})$/, (_, sign, hour) => ` GMT${sign}${hour.padStart(2, '0')}:00`);
  const timestamp = new Date(normalized);

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`Event seed ${fieldName} value "${value}" must be a valid timestamp.`);
  }

  return timestamp;
}

async function saveFirestoreDocument(origin, projectId, collection, documentId, data, writerAccount, transforms = []) {
  return postJson(
    firestoreCommitUrl(origin, projectId),
    {
      writes: [
        {
          update: {
            name: firestoreDocumentName(projectId, collection, documentId),
            fields: Object.fromEntries(
              Object.entries(data).map(([key, value]) => [key, firestoreValue(value, projectId)]),
            ),
          },
          ...(transforms.length ? { updateTransforms: transforms } : {}),
        },
      ],
    },
    {
      Authorization: `Bearer ${writerAccount.idToken}`,
    },
  );
}

async function saveUserProfile(origin, projectId, seed, writerAccount) {
  const profile = normalizeUserProfile(seed);

  return saveFirestoreDocument(origin, projectId, 'userProfiles', seed.profileId, profile, writerAccount, [
    {
      fieldPath: 'updatedAt',
      setToServerValue: 'REQUEST_TIME',
    },
  ]);
}

async function loadAppConfigSeed() {
  try {
    return JSON.parse(await readFile(appConfigSeedPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function saveAppConfig(firestore, appConfig) {
  if (!appConfig) return null;

  return firestore.doc('app/appConfig').set(appConfig);
}

function normalizeEventSeed(seed) {
  return Object.fromEntries(
    Object.entries(seed).map(([key, value]) => {
      if (key === 'userProfile') {
        if (!String(value || '').trim()) return [key, ''];
        return [key, { __reference: value }];
      }

      if (key === 'dateStart' || key === 'dateEnd') {
        return [key, parseSeedTimestamp(value, key)];
      }

      return [key, value];
    }),
  );
}

async function loadEventSeeds() {
  let files;

  try {
    files = (await readdir(eventsSeedDir))
      .filter((file) => extname(file) === '.json')
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return Promise.all(
    files.map(async (file) => {
      const documentId = basename(file, '.json').trim();
      const seedPath = resolve(eventsSeedDir, file);
      const event = normalizeEventSeed(JSON.parse(await readFile(seedPath, 'utf8')));

      if (!documentId) {
        throw new Error(`Seed file ${seedPath} must have a document ID filename.`);
      }

      if (event.eventType === 'shift-open') {
        if (event.userProfile !== '') {
          throw new Error(`Seed file ${seedPath} must leave userProfile empty for shift-open events.`);
        }
      } else if (!event.userProfile?.__reference) {
        throw new Error(`Seed file ${seedPath} must provide a userProfile reference.`);
      }

      if (['check-in', 'check-out'].includes(event.eventType)) {
        if (event.dateEnd !== null && event.dateEnd !== '') {
          throw new Error(`Seed file ${seedPath} must leave dateEnd empty for check-in and check-out events.`);
        }

        delete event.dateEnd;
      } else if (event.dateEnd === null || event.dateEnd === '') {
        throw new Error(`Seed file ${seedPath} must provide dateEnd.`);
      }

      return {
        documentId,
        event,
      };
    }),
  );
}

async function saveEvent(origin, projectId, seed, writerAccount) {
  return saveFirestoreDocument(origin, projectId, 'events', seed.documentId, seed.event, writerAccount);
}

function remapEventSeedReferences(events, profileIdsByEmployeeCode) {
  return events.map((seed) => {
    const reference = seed.event.userProfile?.__reference;
    if (!reference) return seed;

    const employeeCode = reference.replace(/^userProfiles\//, '');
    const profileId = profileIdsByEmployeeCode.get(employeeCode);

    if (!profileId) {
      throw new Error(`Event seed ${seed.documentId} references missing user profile ${reference}.`);
    }

    return {
      ...seed,
      event: {
        ...seed.event,
        userProfile: { __reference: `userProfiles/${profileId}` },
      },
    };
  });
}

function documentTitleFromFile(fileName) {
  return String(fileName || 'Document.pdf').replace(/\.[^.]+$/, '').trim() || 'Document';
}

function normalizeDocumentSeed(seed, seedPath) {
  const userProfileId = String(seed.userProfile || '').replace(/^userProfiles\//, '').trim();
  const fileName = String(seed.fileName || '').trim();

  if (!userProfileId) {
    throw new Error(`Seed file ${seedPath} must provide userProfile.`);
  }

  if (!fileName || fileName.includes('/')) {
    throw new Error(`Seed file ${seedPath} must provide a local PDF fileName.`);
  }

  return {
    userProfileId,
    fileName,
    title: String(seed.title || documentTitleFromFile(fileName)).trim(),
    contentType: String(seed.contentType || 'application/pdf').trim(),
  };
}

async function loadDocumentSeeds() {
  let files;

  try {
    files = (await readdir(documentsSeedDir))
      .filter((file) => extname(file) === '.json')
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return Promise.all(
    files.map(async (file) => {
      const documentId = basename(file, '.json').trim();
      const seedPath = resolve(documentsSeedDir, file);
      const document = normalizeDocumentSeed(JSON.parse(await readFile(seedPath, 'utf8')), seedPath);

      if (!documentId) {
        throw new Error(`Seed file ${seedPath} must have a document ID filename.`);
      }

      return {
        documentId,
        document,
        filePath: resolve(documentsSeedDir, document.fileName),
      };
    }),
  );
}

function assertDocumentReferences(documents, profiles) {
  const profileIds = new Set(profiles.map((profile) => profile.employeeCode));

  for (const { documentId, document } of documents) {
    if (!profileIds.has(document.userProfileId)) {
      throw new Error(`Document seed ${documentId} references missing user profile ${document.userProfileId}.`);
    }
  }
}

function remapDocumentSeedReferences(documents, profileIdsByEmployeeCode) {
  return documents.map((seed) => {
    const profileId = profileIdsByEmployeeCode.get(seed.document.userProfileId);

    if (!profileId) {
      throw new Error(`Document seed ${seed.documentId} references missing user profile ${seed.document.userProfileId}.`);
    }

    return {
      ...seed,
      document: {
        ...seed.document,
        userProfileId: profileId,
      },
    };
  });
}

function contentTypeForPortrait(filePath) {
  const extension = extname(filePath).toLowerCase();

  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';

  throw new Error(`Portrait seed ${filePath} must be a JPG, PNG, or WebP image.`);
}

async function loadPortraitSeeds() {
  let files;

  try {
    files = (await readdir(userPortraitsSeedDir))
      .filter((file) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return files.map((file) => {
    const employeeCode = basename(file, extname(file)).trim();
    const filePath = resolve(userPortraitsSeedDir, file);

    if (!employeeCode) {
      throw new Error(`Portrait seed ${filePath} must use the employee ID as the filename.`);
    }

    return {
      employeeCode,
      extension: extname(file).toLowerCase(),
      contentType: contentTypeForPortrait(filePath),
      filePath,
    };
  });
}

function assertPortraitReferences(portraits, profiles) {
  const profileIds = new Set(profiles.map((profile) => profile.employeeCode));

  for (const portrait of portraits) {
    if (!profileIds.has(portrait.employeeCode)) {
      throw new Error(`Portrait seed ${portrait.filePath} references missing user profile ${portrait.employeeCode}.`);
    }
  }
}

function preparePortraitSeeds(portraits, profileIdsByEmployeeCode) {
  return portraits.map((portrait) => {
    const profileId = profileIdsByEmployeeCode.get(portrait.employeeCode);

    if (!profileId) {
      throw new Error(`Portrait seed ${portrait.filePath} references missing user profile ${portrait.employeeCode}.`);
    }

    return {
      ...portrait,
      profileId,
      storagePath: `userPortraits/${profileId}${portrait.extension}`,
    };
  });
}

function applyPortraitSeeds(profiles, portraits) {
  const portraitsByEmployeeCode = new Map(
    portraits.map((portrait) => [portrait.employeeCode, portrait]),
  );

  return profiles.map((profile) => ({
    ...profile,
    portraitPath: portraitsByEmployeeCode.get(profile.employeeCode)?.storagePath || profile.portraitPath,
  }));
}

async function saveDocument(bucketName, storage, firestore, seed) {
  const fileBuffer = await readFile(seed.filePath);
  const storagePath = `employeeDocuments/${seed.document.userProfileId}/${seed.documentId}/${seed.document.fileName}`;

  await storage.bucket(bucketName).file(storagePath).save(fileBuffer, {
    contentType: seed.document.contentType,
    metadata: {
      metadata: {
        userProfileId: seed.document.userProfileId,
        documentId: seed.documentId,
      },
    },
  });

  const { FieldValue } = functionsRequire('firebase-admin/firestore');

  return firestore
    .doc(`userProfiles/${seed.document.userProfileId}/documents/${seed.documentId}`)
    .set({
      title: seed.document.title,
      fileName: seed.document.fileName,
      contentType: seed.document.contentType,
      size: fileBuffer.length,
      storagePath,
      userProfileId: seed.document.userProfileId,
      createdAt: FieldValue.serverTimestamp(),
    });
}

async function savePortrait(bucketName, storage, seed) {
  const fileBuffer = await readFile(seed.filePath);

  await storage.bucket(bucketName).file(seed.storagePath).save(fileBuffer, {
    contentType: seed.contentType,
    metadata: {
      metadata: {
        userProfileId: seed.profileId,
        employeeCode: seed.employeeCode,
      },
    },
  });
}

function assertUniqueDocumentIds(seeds) {
  const used = new Set();

  for (const seed of seeds) {
    if (used.has(seed.employeeCode)) {
      throw new Error(`Duplicate employee ID seed: ${seed.employeeCode}.`);
    }

    used.add(seed.employeeCode);
  }
}

function assertEventReferences(events, profiles) {
  const profileIds = new Set(profiles.map((profile) => profile.employeeCode));

  for (const { documentId, event } of events) {
    if (!event.userProfile?.__reference) continue;

    const userProfileId = event.userProfile.__reference.replace(/^userProfiles\//, '');

    if (!profileIds.has(userProfileId)) {
      throw new Error(`Event seed ${documentId} references missing user profile ${event.userProfile.__reference}.`);
    }
  }
}

function seedEmail(seed, seedPath) {
  const email = String(seed.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    throw new Error(`Seed file ${seedPath} must provide the user's email address.`);
  }

  return email;
}

function seedEmployeeCode(profile, documentId, seedPath) {
  if (!documentId) {
    throw new Error(`Seed file ${seedPath} must be named with the employee ID.`);
  }

  if (!profile.employeeCode) {
    throw new Error(`Seed file ${seedPath} must provide employeeCode.`);
  }

  if (profile.employeeCode !== documentId) {
    throw new Error(`Seed file ${seedPath} must be named ${profile.employeeCode}.json to match employeeCode.`);
  }

  return profile.employeeCode;
}

function authClaims(seed) {
  if (seed.claims?.admin === true || seed.role === 'admin') return { role: 'admin' };
  if (seed.claims?.manager === true || seed.role === 'manager') return { role: 'manager' };
  return { role: 'user' };
}

async function loadUserProfileSeeds() {
  const files = (await readdir(userProfilesSeedDir))
    .filter((file) => extname(file) === '.json')
    .sort((a, b) => a.localeCompare(b));

  const seeds = await Promise.all(
    files.map(async (file) => {
      const documentId = basename(file, '.json').trim();
      const seedPath = resolve(userProfilesSeedDir, file);
      const rawSeed = JSON.parse(await readFile(seedPath, 'utf8'));
      const email = seedEmail(rawSeed, seedPath);
      const password = String(rawSeed.password || email).trim();
      const profile = normalizeUserProfile(rawSeed);
      const employeeCode = seedEmployeeCode(profile, documentId, seedPath);
      const authName = authDisplayName(profile, email);
      const claims = authClaims({ ...rawSeed, employeeCode });

      if (!password) {
        throw new Error(`Seed file ${seedPath} must provide a password or email.`);
      }

      if (!profile.dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error(`Seed file ${seedPath} must provide dateOfBirth as YYYY-MM-DD.`);
      }

      return {
        ...profile,
        onboarded: rawSeed.onboarded === false ? false : true,
        email,
        password,
        authName,
        claims,
      };
    }),
  );

  assertUniqueDocumentIds(seeds);
  return seeds;
}

function authDisplayName(profile, email) {
  const names = [
    profile.preferredName,
    [profile.givenNames, profile.surname].filter(Boolean).join(' '),
    email.split('@')[0],
  ];

  return names.map((name) => String(name || '').trim()).find(Boolean);
}

const env = { ...process.env, ...(await loadLocalEnv()) };
// Get this from Firebase Console > Project settings > General > Project ID.
const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || 'UPDATE_ME';
const authOrigin = env.FIREBASE_AUTH_EMULATOR_ORIGIN || env.VITE_FIREBASE_AUTH_EMULATOR_ORIGIN || 'http://localhost:9099';
const firestoreHost = env.FIREBASE_FIRESTORE_EMULATOR_HOST || env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || 'localhost';
const firestorePort = env.FIREBASE_FIRESTORE_EMULATOR_PORT || env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT || '8080';
const firestoreOrigin = env.FIREBASE_FIRESTORE_EMULATOR_ORIGIN || `http://${firestoreHost}:${firestorePort}`;
const storageOrigin = env.FIREBASE_STORAGE_EMULATOR_ORIGIN || 'http://localhost:9199';
const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
const adminStorage = await getAdminStorage(projectId, storageOrigin);
await resetEmulatorData({ authOrigin, projectId, firestoreOrigin, storageBucket, storage: adminStorage });

let seeds = await loadUserProfileSeeds();
let eventSeeds = await loadEventSeeds();
let documentSeeds = await loadDocumentSeeds();
const portraitSeeds = await loadPortraitSeeds();
const appConfigSeed = await loadAppConfigSeed();
assertEventReferences(eventSeeds, seeds);
assertDocumentReferences(documentSeeds, seeds);
assertPortraitReferences(portraitSeeds, seeds);
const adminAuth = await getAdminAuth(projectId, authOrigin);
const adminFirestore = await getAdminFirestore(projectId, firestoreOrigin);
const seededAccounts = [];

for (const seed of seeds) {
  const account = await getLocalAuthUser(authOrigin, seed, adminAuth);
  await adminAuth.setCustomUserClaims(account.localId, seed.claims);
  const refreshedAccount = await signInLocalAuthUser(authOrigin, seed);
  seededAccounts.push({ account: refreshedAccount, seed });
}

const profileIdsByEmployeeCode = new Map(
  seededAccounts.map(({ account, seed }) => [seed.employeeCode, account.localId]),
);
const preparedPortraitSeeds = preparePortraitSeeds(portraitSeeds, profileIdsByEmployeeCode);
seeds = applyPortraitSeeds(
  seeds.map((seed) => ({
    ...seed,
    profileId: profileIdsByEmployeeCode.get(seed.employeeCode),
  })),
  preparedPortraitSeeds,
);
eventSeeds = remapEventSeedReferences(eventSeeds, profileIdsByEmployeeCode);
documentSeeds = remapDocumentSeedReferences(documentSeeds, profileIdsByEmployeeCode);

const writerAccount = seededAccounts.find(({ seed }) => seed.email === 'admin@example.com')?.account;

if (!writerAccount) {
  throw new Error('The admin@example.com bootstrap admin seed is required to write profile documents.');
}

for (const portraitSeed of preparedPortraitSeeds) {
  await savePortrait(storageBucket, adminStorage, portraitSeed);
  console.log(`Seeded ${portraitSeed.storagePath}`);
}

for (const { seed } of seededAccounts) {
  const profileSeed = seeds.find((item) => item.email === seed.email);
  await saveUserProfile(firestoreOrigin, projectId, profileSeed, writerAccount);
  console.log(`Seeded local Auth user and userProfiles/${profileSeed.profileId}: ${seed.email}`);
}

if (appConfigSeed) {
  await saveAppConfig(adminFirestore, appConfigSeed);
  console.log('Seeded app/appConfig');
}

for (const eventSeed of eventSeeds) {
  await saveEvent(firestoreOrigin, projectId, eventSeed, writerAccount);
  console.log(`Seeded events/${eventSeed.documentId}`);
}

for (const documentSeed of documentSeeds) {
  await saveDocument(storageBucket, adminStorage, adminFirestore, documentSeed);
  console.log(`Seeded userProfiles/${documentSeed.document.userProfileId}/documents/${documentSeed.documentId}`);
}
