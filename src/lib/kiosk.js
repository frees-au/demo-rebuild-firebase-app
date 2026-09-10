import {
  firebaseConfig,
  functionEndpoint,
  functionsEmulatorOrigin,
  functionsRegion,
  useFirebaseEmulators,
} from './firebaseEnvironment.js';
import { getCurrentUserToken } from './auth.js';

export const kioskManagerLoginUntilKey = 'ac.kiosk.managerLoginUntil';

function kioskEndpoint() {
  if (useFirebaseEmulators) {
    return `${functionsEmulatorOrigin}/${firebaseConfig.projectId}/${functionsRegion}/kiosk`;
  }

  return functionEndpoint('kiosk', { directOnEmulator: true });
}

function kioskUrl(searchParams = null) {
  const url = new URL(kioskEndpoint(), window.location.origin);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

export async function enableKioskMode() {
  const token = await getCurrentUserToken();
  const response = await fetch(kioskUrl(), {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({ action: 'startKioskMode', idToken: token }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Kiosk mode could not be started.');
  }

  localStorage.removeItem(kioskManagerLoginUntilKey);
  return payload.kioskSession || null;
}

export function disableKioskMode() {
  localStorage.removeItem(kioskManagerLoginUntilKey);
}

export function setKioskManagerLoginWindow(seconds) {
  const duration = Number(seconds);

  if (!Number.isFinite(duration) || duration <= 0) {
    localStorage.removeItem(kioskManagerLoginUntilKey);
    return null;
  }

  const expiresAt = Date.now() + Math.floor(duration) * 1000;
  localStorage.setItem(kioskManagerLoginUntilKey, String(expiresAt));
  return expiresAt;
}

export function kioskManagerLoginExpiresAt() {
  const expiresAt = Number(localStorage.getItem(kioskManagerLoginUntilKey));

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    localStorage.removeItem(kioskManagerLoginUntilKey);
    return null;
  }

  return expiresAt;
}

export async function loadKioskEmployees() {
  const response = await fetch(kioskUrl(), {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Employees could not be loaded.');
  }

  return Array.isArray(payload.employees)
    ? payload.employees.map((employee) => ({
      ...employee,
      portraitUrl: employee.portraitPath ? kioskUrl({ portrait: employee.portraitPath }) : '',
    }))
    : [];
}

export async function matchKioskPin(employeeCode, pin, attendanceAction = 'check-in') {
  const response = await fetch(kioskUrl(), {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({ employeeCode, pin, attendanceAction }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'PIN was not accepted.');
  }

  return payload.user || null;
}
