import { getCurrentUserToken } from './auth.js';
import { functionEndpoint } from './firebaseEnvironment.js';
import {
  defaultLanguage,
  defaultTimezone,
  languageOptions,
  timezoneOptions,
} from './preferenceOptions.js';
import { normalizeThemeColors } from './theme.js';

export {
  defaultLanguage,
  defaultTimezone,
  languageOptions,
  timezoneOptions,
} from './preferenceOptions.js';

const defaultAppConfig = Object.freeze({
  kioskLockSeconds: null,
  nextEmployeeNumber: 7,
  timezone: defaultTimezone,
  defaultLanguage,
  themeColors: {},
});

const appConfigEndpoint = () => functionEndpoint('app-config');

function normalizeLockSeconds(value) {
  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return Math.floor(seconds);
}

function normalizeNextEmployeeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return defaultAppConfig.nextEmployeeNumber;
  }

  return Math.floor(number);
}

function optionValue(value, options, fallback) {
  const normalized = String(value || '').trim();
  return options.some((option) => option.value === normalized) ? normalized : fallback;
}

function normalizeAppConfig(config = {}) {
  return {
    kioskLockSeconds: normalizeLockSeconds(config.kioskLockSeconds),
    nextEmployeeNumber: normalizeNextEmployeeNumber(config.nextEmployeeNumber),
    timezone: optionValue(config.timezone, timezoneOptions, defaultTimezone),
    defaultLanguage: optionValue(config.defaultLanguage, languageOptions, defaultLanguage),
    themeColors: normalizeThemeColors(config.themeColors),
  };
}

export async function loadAppConfig() {
  const response = await fetch(appConfigEndpoint(), {
    method: 'GET',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'App config could not be loaded.');
  }

  return {
    ...defaultAppConfig,
    ...normalizeAppConfig(payload.config),
  };
}

export async function saveAppConfig(config) {
  const normalized = normalizeAppConfig(config);
  const writableConfig = { ...normalized };

  if (!('themeColors' in config)) {
    delete writableConfig.themeColors;
  }

  const token = await getCurrentUserToken();
  const response = await fetch(appConfigEndpoint(), {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config: writableConfig }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'App config could not be saved.');
  }

  return {
    ...defaultAppConfig,
    ...normalizeAppConfig(payload.config || normalized),
  };
}

export async function saveThemeColors(themeColors) {
  const normalized = normalizeThemeColors(themeColors);
  const config = await saveAppConfig({ themeColors: normalized });
  return config.themeColors;
}
