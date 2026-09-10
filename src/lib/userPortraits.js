import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db } from './firestore.js';
import { storage } from './storage.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensionByType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const typeByExtension = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function cleanProfileId(profileId) {
  return String(profileId || '').trim();
}

function portraitExtension(file) {
  const fallback = String(file?.name || '').split('.').pop()?.toLowerCase();
  return extensionByType[resolveContentType(file)] || (fallback && fallback.match(/^[a-z0-9]+$/) ? fallback : 'jpg');
}

function resolveContentType(file) {
  const explicitType = String(file?.type || '').trim().toLowerCase();
  if (explicitType) return explicitType;

  const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
  return typeByExtension[extension] || '';
}

export function portraitStoragePath(profileId, file) {
  const cleanedProfileId = cleanProfileId(profileId);

  if (!cleanedProfileId) {
    throw new Error('Choose an employee before saving a portrait.');
  }

  return `userPortraits/${cleanedProfileId}.${portraitExtension(file)}`;
}

export async function userPortraitUrl(profile) {
  if (!profile?.portraitPath) return '';
  return getDownloadURL(ref(storage, profile.portraitPath));
}

export async function uploadUserPortrait(profileId, file) {
  const portraitPath = await uploadUserPortraitFile(profileId, file);

  await updateDoc(doc(db, 'userProfiles', cleanProfileId(profileId)), {
    portraitPath,
    updatedAt: serverTimestamp(),
  });

  return portraitPath;
}

export async function uploadUserPortraitFile(profileId, file) {
  const cleanedProfileId = cleanProfileId(profileId);

  if (!cleanedProfileId) {
    throw new Error('Choose an employee before saving a portrait.');
  }

  if (!file) {
    throw new Error('Choose an image before saving a portrait.');
  }

  const contentType = resolveContentType(file);

  if (!allowedTypes.has(contentType)) {
    throw new Error('Use a JPG, PNG, or WebP image.');
  }

  const portraitPath = portraitStoragePath(cleanedProfileId, file);

  await uploadBytes(ref(storage, portraitPath), file, {
    contentType,
    customMetadata: {
      userProfileId: cleanedProfileId,
    },
  });

  return portraitPath;
}
