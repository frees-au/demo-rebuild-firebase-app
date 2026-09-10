import AccountPage from './routes/AccountPage.svelte';
import AdminPage from './routes/AdminPage.svelte';
import DocumentsPage from './routes/DocumentsPage.svelte';
import EmployeesPage from './routes/EmployeesPage.svelte';
import KioskPage from './routes/KioskPage.svelte';
import LoginPage from './routes/LoginPage.svelte';
import MyShiftsPage from './routes/MyShiftsPage.svelte';
import NotFoundPage from './routes/NotFoundPage.svelte';
import OnboardingPage from './routes/OnboardingPage.svelte';
import ReportsPage from './routes/ReportsPage.svelte';
import SchedulingPage from './routes/SchedulingPage.svelte';
import SettingsPage from './routes/SettingsPage.svelte';
import StyleGuidePage from './routes/StyleGuidePage.svelte';

export const loginPath = '/login/';
export const kioskPath = '/kiosk/';
export const styleGuidePath = '/style-guide/';
export const myShiftsPath = '/my-shifts/';
export const accountPath = '/account/';
export const accountAdminPath = '/accounts/';
export const onboardingPath = '/onboarding/';
export const adminPath = '/dev-tools/';
export const documentsPath = '/documents/';
export const protectedPaths = [myShiftsPath, adminPath, '/employees/', documentsPath, '/reports/', '/scheduling/', '/settings/', accountPath, accountAdminPath, onboardingPath, styleGuidePath];

const routes = {
  '/': LoginPage,
  [accountPath]: AccountPage,
  [adminPath]: AdminPage,
  [documentsPath]: DocumentsPage,
  [kioskPath]: KioskPage,
  [loginPath]: LoginPage,
  [myShiftsPath]: MyShiftsPage,
  [onboardingPath]: OnboardingPage,
  '/employees/': EmployeesPage,
  '/reports/': ReportsPage,
  '/scheduling/': SchedulingPage,
  '/settings/': SettingsPage,
  [styleGuidePath]: StyleGuidePage,
};

export function normalizePath(pathname) {
  if (pathname === '') return '/';
  if (pathname !== '/' && !pathname.endsWith('/')) return `${pathname}/`;
  return pathname;
}

export function getRoute(pathname) {
  const path = normalizePath(pathname);
  if (path.startsWith(accountAdminPath)) return AccountPage;
  if (path.startsWith(documentsPath)) return DocumentsPage;
  return routes[path] || NotFoundPage;
}

export function isProtectedPath(pathname) {
  const path = normalizePath(pathname);
  return !isLoginPath(path) && !isKioskPath(path) && (
    path === styleGuidePath
    || protectedPaths.some((protectedPath) => path.startsWith(protectedPath))
    || !routes[path]
  );
}

export function isAdminPath(pathname) {
  const path = normalizePath(pathname);
  return !isLoginPath(path) && !isKioskPath(path) && !isOnboardingPath(path) && path !== myShiftsPath && path !== styleGuidePath && path !== accountPath && !path.startsWith(documentsPath);
}

export function isLoginPath(pathname) {
  const path = normalizePath(pathname);
  return path === '/' || path === loginPath;
}

export function isKioskPath(pathname) {
  return normalizePath(pathname) === kioskPath;
}

export function isOnboardingPath(pathname) {
  return normalizePath(pathname) === onboardingPath;
}
