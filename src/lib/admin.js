import { getCurrentUserToken } from './auth.js';
import { functionEndpoint } from './firebaseEnvironment.js';

function adminEndpoint() {
  return functionEndpoint('admin');
}

export async function deleteFirestoreDocument({ path, confirmation, recursive }) {
  const token = await getCurrentUserToken();

  const response = await fetch(adminEndpoint(), {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'deleteFirestoreDocument',
      path,
      confirmation,
      recursive: Boolean(recursive),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Firestore document could not be deleted.');
  }

  return payload.result || null;
}
