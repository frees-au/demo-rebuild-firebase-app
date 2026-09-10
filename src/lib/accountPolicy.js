export const allowedAccountDomains = Object.freeze([
  // Get this from Firebase Console > Authentication > Settings > Authorized domains.
  'UPDATE_ME',
  'example.com',
]);

export function isAllowedAccountEmail(email) {
  const domain = String(email || '').trim().toLowerCase().split('@').pop();
  return allowedAccountDomains.includes(domain);
}
