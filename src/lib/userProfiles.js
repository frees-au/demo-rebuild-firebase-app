import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firestore.js';
import { cloneUserProfile, emptyUserProfile, normalizeUserProfile, profileFields } from './userProfileSchema.js';

export { emptyUserProfile, normalizeUserProfile, profileFields };

function profileRef(profileId) {
  return doc(db, 'userProfiles', profileId);
}

export async function loadUserProfile(profileId, defaults = {}) {
  if (!profileId) {
    throw new Error('Choose an account before loading the profile.');
  }

  const snapshot = await getDoc(profileRef(profileId));
  if (!snapshot.exists()) {
    return normalizeUserProfile({}, defaults);
  }

  return normalizeUserProfile(snapshot.data(), defaults);
}

export async function saveUserProfile(profileId, profile) {
  if (!profileId) {
    throw new Error('Choose an account before saving the profile.');
  }

  await setDoc(
    profileRef(profileId),
    {
      ...normalizeUserProfile(profile),
      updatedAt: serverTimestamp(),
    },
  );
}
