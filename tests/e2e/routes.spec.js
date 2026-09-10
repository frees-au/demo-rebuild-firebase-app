import { expect, test } from '@playwright/test';
import { accounts, appConfig, profileByEmployeeCode, profiles } from './seed-fixtures.js';

async function login(page, account) {
  await page.goto('/login/');
  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();

  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/my-shifts\/$/);
  await expect(page.locator('ac-title').filter({ hasText: 'Upcoming shifts' })).toBeVisible();
}

async function expectTitle(page, title) {
  await expect(page.locator('ac-title').filter({ hasText: title })).toBeVisible();
}

async function gotoAndExpectTitle(page, path, title) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`));
  await expectTitle(page, title);
}

test('signed-out users only reach public login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();

  await page.goto('/employees/');
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();

  await page.goto('/not-a-route/');
  await expect(page).toHaveURL(/\/login\/$/);

  await page.goto('/kiosk/');
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();
});

test('administrator can navigate every seeded management pathway', async ({ page }) => {
  await login(page, accounts.admin);

  for (const label of ['My Shifts', 'Employees', 'Documents', 'Reports', 'Scheduling', 'Kiosk Mode']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }
  await expect(page.getByText('Advanced')).toBeVisible();
  await page.getByText('Advanced').click();
  for (const label of ['Settings', 'Dev Tools', 'Style Guide']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }

  await gotoAndExpectTitle(page, '/employees/', 'Employee Directory');
  await expect(page.getByRole('button', { name: 'Add email/password user' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Employees' })).toBeVisible();

  for (const profile of profiles) {
    const row = page.getByRole('row').filter({ hasText: profile.email });
    await expect(row).toContainText(profile.displayName);
    await expect(row).toContainText(profile.roleLabel);
  }

  const andy = profileByEmployeeCode('AC-1001');
  await page.getByRole('row').filter({ hasText: andy.email }).getByRole('link', { name: 'Documents' }).click();
  await expectTitle(page, 'Employee documents');

  await gotoAndExpectTitle(page, '/reports/', 'Reports');
  await expect(page.getByText('No reports yet')).toBeVisible();

  await gotoAndExpectTitle(page, '/settings/', 'Pontify settings');
  await expect(page.getByLabel('Kiosk lock seconds')).toHaveValue(String(appConfig.kioskLockSeconds));
  await expect(page.getByLabel('Next employee ID number')).toHaveValue(String(appConfig.nextEmployeeNumber));
  await expect(page.getByLabel('Timezone')).toHaveValue(appConfig.timezone);
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();

  await gotoAndExpectTitle(page, '/dev-tools/', 'Admin utilities');
  await expect(page.getByRole('heading', { name: 'Delete Firestore document' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete document' })).toBeDisabled();

  await page.goto('/style-guide/');
  await expectTitle(page, 'Theme settings');
  await expect(page.getByRole('heading', { name: 'Svelte components', level: 2 })).toBeVisible();

  await page.goto('/missing-route/');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('manager reaches management pages but not administrator-only tools', async ({ page }) => {
  await login(page, accounts.manager);

  for (const label of ['Employees', 'Documents', 'Reports', 'Scheduling', 'Kiosk Mode']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }
  await expect(page.getByText('Advanced')).toBeVisible();
  await page.getByText('Advanced').click();
  for (const label of ['Settings', 'Style Guide']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Dev Tools' })).toHaveCount(0);

  await gotoAndExpectTitle(page, '/employees/', 'Employee Directory');
  await expect(page.getByRole('button', { name: 'Add email/password user' })).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Employees' })).toContainText(accounts.admin.email);

  await gotoAndExpectTitle(page, '/settings/', 'Pontify settings');
  await expect(page.getByText('Administrator access is required to edit app config.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();

  await page.goto('/dev-tools/');
  await expect(page).toHaveURL(/\/my-shifts\/$/);
  await expectTitle(page, 'Upcoming shifts');
});

test('regular seeded user stays in self-service pathways', async ({ page }) => {
  await login(page, accounts.user);

  await expect(page.getByRole('link', { name: 'My Shifts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Documents' })).toBeVisible();
  for (const label of ['Employees', 'Reports', 'Scheduling', 'Kiosk Mode', 'Admin', 'Settings', 'Dev Tools', 'Style Guide']) {
    await expect(page.getByRole('link', { name: label })).toHaveCount(0);
  }

  await gotoAndExpectTitle(page, '/documents/', 'Your documents');

  await page.goto('/documents/not-their-profile/');
  await expectTitle(page, 'Employee documents');

  for (const path of ['/employees/', '/reports/', '/scheduling/', '/settings/', '/dev-tools/']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/my-shifts\/$/);
    await expectTitle(page, 'Upcoming shifts');
  }

  await page.goto('/style-guide/');
  await expectTitle(page, 'Theme settings');
  await expect(page.getByText('Administrator access is required to edit theme settings.')).toBeVisible();

  await page.goto('/onboarding/');
  await expect(page).toHaveURL(/\/my-shifts\/$/);
});

test('account pathway exposes seeded profile details for the signed-in user', async ({ page }) => {
  await login(page, accounts.user);
  await gotoAndExpectTitle(page, '/account/', 'Your account');

  await expect(page.getByLabel('Given name(s)')).toHaveValue(accounts.user.givenNames);
  await expect(page.getByLabel('Full surname')).toHaveValue(accounts.user.surname);
  await expect(page.getByLabel('Preferred name')).toHaveValue(accounts.user.preferredName);
  await expect(page.getByLabel('Employee ID')).toHaveValue(accounts.user.employeeCode);
  await expect(page.getByLabel('Kiosk PIN')).toHaveValue(accounts.user.kioskPin);

  await page.getByRole('tab', { name: 'Contact' }).click();
  await expect(page.locator('ac-array-section').filter({ hasText: 'Telephones' })).toContainText(accounts.user.telephones[0].telephone);

  await page.getByRole('tab', { name: 'Finance' }).click();
  await expect(page.getByLabel('PIX key')).toHaveValue(accounts.user.financial.pixPaymentAddress);
});

test('kiosk pathway uses seeded employees and PINs', async ({ page }) => {
  const kioskProfile = profileByEmployeeCode('AC-1002');

  await login(page, accounts.admin);
  await page.getByRole('link', { name: 'Kiosk Mode' }).click();
  await expect(page.getByRole('button', { name: kioskProfile.displayName })).toBeVisible();

  await page.getByRole('button', { name: kioskProfile.displayName }).click();
  await expect(page.getByRole('dialog', { name: 'Kiosk PIN' })).toBeVisible();
  await page.locator('#kiosk-pin').fill(kioskProfile.kioskPin);
  await page.getByRole('button', { name: 'Check-in' }).click();

  await expect(page).toHaveURL(/\/kiosk\/$/);
  await expect(page.getByRole('status')).toContainText('Successfully checked in.');

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.getByRole('button', { name: kioskProfile.displayName })).toBeVisible();
});
