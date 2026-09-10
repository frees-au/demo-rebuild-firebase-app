import { expect, test } from '@playwright/test';
import { accounts, events, profiles } from './seed-fixtures.js';

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

function expectedSeedNames() {
  return profiles.map((profile) => profile.displayName).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

test('calendar pathway shows seeded staff, event types, filters, and day schedule', async ({ page }) => {
  await login(page, accounts.admin);
  await gotoAndExpectTitle(page, '/scheduling/', 'Calendar');

  await expect(page.getByLabel('Staff')).toContainText('All staff');
  for (const name of expectedSeedNames()) {
    await expect(page.getByLabel('Staff')).toContainText(name);
  }

  for (const label of ['Shift', 'Available Shift', 'Medical appointment', 'Check in', 'Check out']) {
    await expect(page.getByLabel('Event type colours')).toContainText(label);
  }

  await page.getByRole('button', { name: 'Hours' }).click();
  await page.getByLabel('Hours view date').fill('2026-09-07');
  await expect(page.locator('ac-hours-shell')).toContainText('Monday 7 September 2026');

  const seededDayNames = ['Andy', 'Baz', 'Simon'];
  for (const name of seededDayNames) {
    await expect(page.locator('ac-hours-shell')).toContainText(name);
  }

  await page.getByRole('button', { name: 'In/Out' }).click();
  await expect(page.getByLabel('Event type colours')).toContainText('Check in');
  await expect(page.getByLabel('Event type colours')).toContainText('Check out');

  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('dialog')).toContainText('Add event');
  await expect(page.getByLabel('Staff')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  expect(events.length).toBeGreaterThan(0);
});
