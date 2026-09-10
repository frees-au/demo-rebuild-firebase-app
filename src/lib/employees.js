import { getCurrentUserToken } from './auth.js';
import { functionEndpoint, useFirebaseEmulators } from './firebaseEnvironment.js';

async function fetchEmployeesFrom(endpoint, fallbackMessage) {
  const token = await getCurrentUserToken();

  const response = await fetch(endpoint, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage);
  }

  return Array.isArray(payload.employees) ? payload.employees : [];
}

async function saveEmployeeRoleAt(endpoint, uid, role) {
  const token = await getCurrentUserToken();

  const response = await fetch(endpoint, {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uid, role }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Role could not be saved.');
  }

  return payload.employee || null;
}

async function createEmployeeAt(endpoint, employee) {
  const token = await getCurrentUserToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(employee),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Employee account could not be created.');
  }

  return payload.employee || null;
}

async function fetchCloudEmployees() {
  return fetchEmployeesFrom('/api/employees', 'Employees could not be loaded.');
}

function employeesEndpoint() {
  return functionEndpoint('employees');
}

async function fetchEmulatorEmployees() {
  return fetchEmployeesFrom(employeesEndpoint(), 'Local emulator employees could not be loaded.');
}

export async function fetchEmployees() {
  if (useFirebaseEmulators) {
    return fetchEmulatorEmployees();
  }

  return fetchCloudEmployees();
}

export async function createEmployee(employee) {
  return createEmployeeAt(employeesEndpoint(), employee);
}

export async function saveEmployeeRole(uid, role) {
  return saveEmployeeRoleAt(employeesEndpoint(), uid, role);
}
