import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db } from './firestore.js';
import { storage } from './storage.js';

const allowedContentTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const contentTypesByExtension = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const sortOptions = {
  date: orderBy('createdAt', 'desc'),
  title: orderBy('title', 'asc'),
};

function documentsCollection(profileId) {
  return collection(db, 'userProfiles', profileId, 'documents');
}

function cleanFilename(name) {
  return String(name || 'document.pdf').replace(/[^\w.\- ]+/g, '').trim() || 'document.pdf';
}

function titleFromFilename(name) {
  return cleanFilename(name).replace(/\.[^.]+$/, '').trim() || 'Document';
}

function contentTypeForFile(file) {
  if (allowedContentTypes.has(file.type)) return file.type;

  const lowerName = String(file.name || '').toLowerCase();
  const extension = lowerName.match(/\.[^.]+$/)?.[0];

  return contentTypesByExtension[extension] || '';
}

export function documentLibraryPath(profileId) {
  return `/documents/${encodeURIComponent(profileId)}/`;
}

export async function listDocuments(profileId, sortBy = 'date') {
  if (!profileId) {
    throw new Error('Choose an employee before loading documents.');
  }

  const sortOrder = sortOptions[sortBy] || sortOptions.date;
  const snapshot = await getDocs(query(documentsCollection(profileId), sortOrder));

  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}

export async function addEmployeeDocument(profileId, file) {
  if (!profileId) {
    throw new Error('Choose an employee before adding a file.');
  }

  if (!file) {
    throw new Error('Choose a file before adding it.');
  }

  const contentType = contentTypeForFile(file);

  if (!contentType) {
    throw new Error('Use a PDF, JPG, PNG, or WebP file.');
  }

  const fileName = cleanFilename(file.name);
  const documentRef = doc(documentsCollection(profileId));
  const storagePath = `employeeDocuments/${profileId}/${documentRef.id}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType,
    customMetadata: {
      userProfileId: profileId,
      documentId: documentRef.id,
    },
  });

  await setDoc(doc(db, 'userProfiles', profileId, 'documents', documentRef.id), {
    title: titleFromFilename(fileName),
    fileName,
    contentType,
    size: file.size,
    storagePath,
    userProfileId: profileId,
    createdAt: serverTimestamp(),
  });

  return documentRef.id;
}

export async function documentDownloadUrl(document) {
  if (!document?.storagePath) {
    throw new Error('This document does not have a stored file yet.');
  }

  return getDownloadURL(ref(storage, document.storagePath));
}
