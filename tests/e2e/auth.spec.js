import { expect, test } from '@playwright/test';

const adminEmail = 'admin@example.com';
const adminPassword = adminEmail;

test('logs in and logs out with a seeded Pontify account', async ({ page }) => {
  await page.goto('/login/');

  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();

  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/my-shifts\/$/);
  await expect(page.locator('ac-title').filter({ hasText: 'Upcoming shifts' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();
});
