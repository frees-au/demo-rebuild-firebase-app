export const functionsRegion = 'southamerica-east1';

const allowedDomains = new Set([
  // Get this from Firebase Console > Authentication > Settings > Authorized domains.
  'UPDATE_ME',
  'example.com',
]);

export function isAllowedEmail(email) {
  const domain = String(email || '').trim().toLowerCase().split('@').pop();
  return allowedDomains.has(domain);
}
