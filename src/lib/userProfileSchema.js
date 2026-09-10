import { defaultLanguage, defaultTimezone, languageOptions, timezoneOptions } from './preferenceOptions.js';

export const profileFields = [
  { path: 'givenNames', label: 'Given name(s)', type: 'text', tab: 'details' },
  { path: 'surname', label: 'Full surname', type: 'text', tab: 'details' },
  { path: 'preferredName', label: 'Preferred name', type: 'text', tab: 'details' },
  { path: 'employeeCode', label: 'Employee ID', type: 'text', tab: 'details' },
  { path: 'onboarded', label: 'Onboarded', type: 'boolean', tab: 'system' },
  { path: 'portraitPath', label: 'Portrait path', type: 'text', tab: 'system' },
  { path: 'kioskPin', label: 'Kiosk PIN', type: 'password', tab: 'details' },
  { path: 'telephones', label: 'Telephones', type: 'json', fallback: [], tab: 'contact' },
  { path: 'primaryPosition', label: 'Primary position', type: 'text', tab: 'details' },
  { path: 'status', label: 'Status', type: 'boolean', tab: 'details' },
  { path: 'employmentType', label: 'Employment type', type: 'text', tab: 'details' },
  { path: 'cpf', label: 'CPF', type: 'text', tab: 'identity' },
  { path: 'dateOfBirth', label: 'Date of birth', type: 'date', tab: 'details' },
  { path: 'identity.rg', label: 'RG number', type: 'text', tab: 'identity' },
  { path: 'identity.rnm', label: 'RNM number', type: 'text', tab: 'identity' },
  { path: 'identity.driversLicense', label: 'Driver license', type: 'text', tab: 'identity' },
  { path: 'identity.ctps', label: 'CTPS', type: 'text', tab: 'identity' },
  { path: 'identity.pis', label: 'PIS', type: 'text', tab: 'identity' },
  { path: 'hireDate', label: 'Start date', type: 'date', tab: 'details' },
  { path: 'addresses', label: 'Addresses', type: 'json', fallback: [], tab: 'contact' },
  { path: 'financial.pixPaymentAddress', label: 'PIX key', type: 'text', tab: 'finance' },
  { path: 'financial.bankName', label: 'Bank / institution name', type: 'text', tab: 'finance' },
  { path: 'financial.bankCode', label: 'Bank code', type: 'text', tab: 'finance' },
  { path: 'financial.bankBranch', label: 'Branch / agency', type: 'text', tab: 'finance' },
  { path: 'financial.bankBranchDigit', label: 'Branch digit', type: 'text', tab: 'finance' },
  { path: 'financial.bankAccount', label: 'Account number', type: 'text', tab: 'finance' },
  { path: 'financial.bankAccountDigit', label: 'Account digit', type: 'text', tab: 'finance' },
  { path: 'financial.bankAccountType', label: 'Account type', type: 'text', tab: 'finance' },
  { path: 'financial.bankAccountIsEmployeeOwned', label: 'Account is employee owned', type: 'nullableBoolean', tab: 'finance' },
  { path: 'financial.bankAccountHolderName', label: 'Account holder name', type: 'text', tab: 'finance' },
  { path: 'financial.bankAccountHolderCpf', label: 'Account holder CPF', type: 'text', tab: 'finance' },
  { path: 'financial.bankAccountHolderRelationship', label: 'Account holder relationship', type: 'text', tab: 'finance' },
  { path: 'routeCostCents', label: 'Route cost cents', type: 'number', tab: 'details' },
  { path: 'routeTimeMinutes', label: 'Route time minutes', type: 'number', tab: 'details' },
  { path: 'nextOfKinName', label: 'Emergency contact name', type: 'text', tab: 'details' },
  { path: 'nextOfKinRelationship', label: 'Emergency contact relationship', type: 'text', tab: 'details' },
  { path: 'nextOfKinTelephone', label: 'Emergency contact phone', type: 'tel', tab: 'details' },
  { path: 'notes', label: 'Notes', type: 'textarea', tab: 'details' },
  { path: 'localTimezone', label: 'Local timezone', type: 'select', options: timezoneOptions, tab: 'preferences' },
  { path: 'calendarTimezone', label: 'Calendar timezone', type: 'select', options: timezoneOptions, tab: 'preferences' },
  { path: 'preferredLanguage', label: 'Preferred language', type: 'select', options: languageOptions, tab: 'preferences' },
];

export const emptyUserProfile = {
  givenNames: '',
  surname: '',
  preferredName: '',
  employeeCode: '',
  onboarded: false,
  portraitPath: '',
  kioskPin: '',
  telephones: [],
  primaryPosition: '',
  status: false,
  employmentType: '',
  cpf: '',
  dateOfBirth: '',
  identity: {
    rg: '',
    rnm: '',
    driversLicense: '',
    ctps: '',
    pis: '',
  },
  hireDate: '',
  addresses: [],
  financial: {
    pixPaymentAddress: '',
    bankName: '',
    bankCode: '',
    bankBranch: '',
    bankBranchDigit: '',
    bankAccount: '',
    bankAccountDigit: '',
    bankAccountType: '',
    bankAccountIsEmployeeOwned: null,
    bankAccountHolderName: '',
    bankAccountHolderCpf: '',
    bankAccountHolderRelationship: '',
  },
  routeCostCents: null,
  routeTimeMinutes: null,
  nextOfKinName: '',
  nextOfKinRelationship: '',
  nextOfKinTelephone: '',
  notes: '',
  localTimezone: defaultTimezone,
  calendarTimezone: defaultTimezone,
  preferredLanguage: defaultLanguage,
};

function profileDefaults(defaults = {}) {
  return {
    ...emptyUserProfile,
    localTimezone: defaults.localTimezone || defaults.timezone || defaultTimezone,
    calendarTimezone: defaults.calendarTimezone || defaults.localTimezone || defaults.timezone || defaultTimezone,
    preferredLanguage: defaults.preferredLanguage || defaults.defaultLanguage || defaultLanguage,
  };
}

function cloneProfile(profile) {
  return structuredClone(profile);
}

function getValue(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

function setValue(target, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((current, key) => {
    current[key] = current[key] && typeof current[key] === 'object' && !Array.isArray(current[key])
      ? current[key]
      : {};
    return current[key];
  }, target);
  parent[last] = value;
}

export function cloneUserProfile(profile = emptyUserProfile) {
  return cloneProfile(profile);
}

export function normalizeUserProfile(profile = {}, defaults = {}) {
  const normalized = cloneProfile(profileDefaults(defaults));

  for (const field of profileFields) {
    const rawValue = getValue(profile, field.path);
    if (rawValue === undefined) continue;

    if (field.type === 'boolean') {
      setValue(normalized, field.path, rawValue === true || rawValue === 'true' || (field.path === 'status' && rawValue === 'active'));
    } else if (field.type === 'nullableBoolean') {
      setValue(normalized, field.path, rawValue === null || rawValue === '' ? null : rawValue === true);
    } else if (field.type === 'number') {
      setValue(normalized, field.path, rawValue === null || rawValue === '' ? null : Number(rawValue));
    } else if (field.type === 'json') {
      setValue(normalized, field.path, Array.isArray(rawValue) ? rawValue : cloneProfile(field.fallback));
    } else if (field.type === 'select') {
      const rawOption = String(rawValue || '').trim();
      const fallback = field.options?.[0]?.value || '';
      const option = field.options?.some((item) => item.value === rawOption) ? rawOption : fallback;
      setValue(normalized, field.path, option);
    } else {
      setValue(normalized, field.path, String(rawValue || '').trim());
    }
  }

  return normalized;
}
