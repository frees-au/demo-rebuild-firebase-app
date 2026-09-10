import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';

const root = resolve(process.cwd(), 'seeds');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function displayName(profile) {
  return [
    profile.preferredName,
    [profile.givenNames, profile.surname].filter(Boolean).join(' '),
    profile.email,
    profile.employeeCode,
  ]
    .map((value) => String(value || '').trim())
    .find(Boolean);
}

function roleFor(profile) {
  if (profile.claims?.admin) return 'Administrator';
  if (profile.claims?.manager) return 'Manager';
  return 'User';
}

export const profiles = readdirSync(resolve(root, 'userProfiles'))
  .filter((file) => extname(file) === '.json')
  .sort((a, b) => a.localeCompare(b))
  .map((file) => {
    const profile = readJson(resolve(root, 'userProfiles', file));
    return {
      ...profile,
      seedId: basename(file, '.json'),
      password: profile.email,
      displayName: displayName(profile),
      roleLabel: roleFor(profile),
    };
  });

export const appConfig = readJson(resolve(root, 'app', 'appConfig.json'));

export const accounts = {
  admin: profiles.find((profile) => profile.claims?.admin),
  manager: profiles.find((profile) => profile.claims?.manager),
  user: profiles.find((profile) => !profile.claims?.admin && !profile.claims?.manager),
};

export const documents = readdirSync(resolve(root, 'documents'))
  .filter((file) => extname(file) === '.json')
  .sort((a, b) => a.localeCompare(b))
  .map((file) => {
    const document = readJson(resolve(root, 'documents', file));
    return {
      ...document,
      seedId: basename(file, '.json'),
      title: String(document.title || document.fileName || '').replace(/\.[^.]+$/, ''),
    };
  });

export const events = readdirSync(resolve(root, 'events'))
  .filter((file) => extname(file) === '.json')
  .sort((a, b) => a.localeCompare(b))
  .map((file) => ({
    ...readJson(resolve(root, 'events', file)),
    seedId: basename(file, '.json'),
  }));

export function profileByEmployeeCode(employeeCode) {
  return profiles.find((profile) => profile.employeeCode === employeeCode);
}
