import { expect, test } from '@playwright/test';
import { accounts } from './seed-fixtures.js';

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

async function saveAccountAndReloadContactTab(page) {
  await page.getByRole('button', { name: 'Save account' }).click();
  await expect(page.getByRole('status')).toContainText('Account saved.');
  await page.reload();
  await expectTitle(page, 'Your account');
  await page.getByRole('tab', { name: 'Contact' }).click();
}

test('user can create, update, and delete telephone and address popups', async ({ page }) => {
  await login(page, accounts.user);
  await gotoAndExpectTitle(page, '/account/', 'Your account');
  await page.getByRole('tab', { name: 'Contact' }).click();

  const telephones = page.locator('ac-array-section').filter({ hasText: 'Telephones' });
  const addresses = page.locator('ac-array-section').filter({ hasText: 'Addresses' });

  await telephones.getByRole('button', { name: 'Add telephone' }).click();
  let telephoneDialog = page.getByRole('dialog', { name: 'Add telephone' });
  await expect(telephoneDialog).toBeVisible();
  await telephoneDialog.getByLabel('Label').fill('Playwright mobile');
  await telephoneDialog.getByLabel('Telephone', { exact: true }).fill('+55 21 99999-0001');
  await telephoneDialog.getByLabel('Default telephone').check();
  await telephoneDialog.getByRole('button', { name: 'Confirm add telephone' }).click();
  await expect(telephoneDialog).toHaveCount(0);
  await expect(telephones).toContainText('Playwright mobile');
  await expect(telephones).toContainText('+55 21 99999-0001');

  await addresses.getByRole('button', { name: 'Add address' }).click();
  let addressDialog = page.getByRole('dialog', { name: 'Add address' });
  await expect(addressDialog).toBeVisible();
  await addressDialog.getByLabel('Street').fill('Rua Playwright');
  await addressDialog.getByLabel('Number').fill('404');
  await addressDialog.getByLabel('Complement').fill('Suite Test');
  await addressDialog.getByLabel('Neighbourhood').fill('Centro');
  await addressDialog.getByLabel('City').fill('Rio de Janeiro');
  await addressDialog.getByLabel('State').fill('RJ');
  await addressDialog.getByLabel('CEP').fill('20000-000');
  await addressDialog.getByLabel('Can receive mail').check();
  await addressDialog.getByRole('button', { name: 'Confirm add address' }).click();
  await expect(addressDialog).toHaveCount(0);
  await expect(addresses).toContainText('Rua Playwright, 404, Suite Test');
  await expect(addresses).toContainText('Centro, Rio de Janeiro, RJ, 20000-000');

  await saveAccountAndReloadContactTab(page);
  await expect(telephones).toContainText('Playwright mobile');
  await expect(telephones).toContainText('+55 21 99999-0001');
  await expect(addresses).toContainText('Rua Playwright, 404, Suite Test');
  await expect(addresses).toContainText('Centro, Rio de Janeiro, RJ, 20000-000');

  await telephones.locator('ac-card').filter({ hasText: 'Playwright mobile' }).getByRole('button', { name: /Edit telephone/ }).click();
  telephoneDialog = page.getByRole('dialog', { name: 'Edit telephone' });
  await telephoneDialog.getByLabel('Label').fill('Playwright office');
  await telephoneDialog.getByLabel('Telephone', { exact: true }).fill('+55 21 99999-0002');
  await telephoneDialog.getByRole('button', { name: 'Close' }).click();

  await addresses.locator('ac-card').filter({ hasText: 'Rua Playwright' }).getByRole('button', { name: /Edit address/ }).click();
  addressDialog = page.getByRole('dialog', { name: 'Edit address' });
  await addressDialog.getByLabel('Street').fill('Avenida Test Runner');
  await addressDialog.getByLabel('Number').fill('405');
  await addressDialog.getByRole('button', { name: 'Close' }).click();

  await saveAccountAndReloadContactTab(page);
  await expect(telephones).toContainText('Playwright office');
  await expect(telephones).toContainText('+55 21 99999-0002');
  await expect(telephones).not.toContainText('Playwright mobile');
  await expect(addresses).toContainText('Avenida Test Runner, 405, Suite Test');
  await expect(addresses).not.toContainText('Rua Playwright');

  await telephones.locator('ac-card').filter({ hasText: 'Playwright office' }).getByRole('button', { name: 'Delete' }).click();
  await addresses.locator('ac-card').filter({ hasText: 'Avenida Test Runner' }).getByRole('button', { name: 'Delete' }).click();

  await saveAccountAndReloadContactTab(page);
  await expect(telephones).not.toContainText('Playwright office');
  await expect(telephones).not.toContainText('+55 21 99999-0002');
  await expect(addresses).not.toContainText('Avenida Test Runner');
});
