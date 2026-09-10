import { expect, test } from '@playwright/test';
import { accounts, documents, profileByEmployeeCode } from './seed-fixtures.js';

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

async function uploadDocument(page, fileName) {
  await page.locator('.documents-file-input').setInputFiles({
    name: fileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
  });
}

test('user document library shows seeded files and accepts uploads', async ({ page }) => {
  await login(page, accounts.user);
  await gotoAndExpectTitle(page, '/documents/', 'Your documents');

  const documentsTable = page.getByRole('table', { name: 'Documents' });
  await expect(documentsTable).toContainText(documents[0].title);
  await expect(page.getByRole('button', { name: 'Add file' })).toBeVisible();

  await uploadDocument(page, 'Playwright User Upload.pdf');
  await expect(page.getByRole('status')).toContainText('Document added.');
  await expect(documentsTable).toContainText('Playwright User Upload');
  await expect(documentsTable).toContainText('1 KB');

  await page.getByLabel('Sort').selectOption('title');
  await expect(documentsTable).toContainText('Playwright User Upload');
});

test('admin can view and upload employee documents', async ({ page }) => {
  const employee = profileByEmployeeCode('AC-1001');

  await login(page, accounts.admin);
  await gotoAndExpectTitle(page, '/employees/', 'Employee Directory');
  await page.getByRole('row').filter({ hasText: employee.email }).getByRole('link', { name: 'Documents' }).click();
  await expectTitle(page, 'Employee documents');

  const documentsTable = page.getByRole('table', { name: 'Documents' });
  await expect(documentsTable).toContainText(documents[0].title);
  await expect(page.getByRole('button', { name: 'Add file' })).toBeVisible();

  await uploadDocument(page, 'Playwright Admin Upload.pdf');
  await expect(page.getByRole('status')).toContainText('Document added.');
  await expect(documentsTable).toContainText('Playwright Admin Upload');
});

test('manager can view employee documents without upload controls', async ({ page }) => {
  const employee = profileByEmployeeCode('AC-1001');

  await login(page, accounts.manager);
  await gotoAndExpectTitle(page, '/employees/', 'Employee Directory');
  await page.getByRole('row').filter({ hasText: employee.email }).getByRole('link', { name: 'Documents' }).click();
  await expectTitle(page, 'Employee documents');

  await expect(page.getByRole('table', { name: 'Documents' })).toContainText(documents[0].title);
  await expect(page.getByRole('button', { name: 'Add file' })).toHaveCount(0);
  await expect(page.locator('.documents-file-input')).toHaveCount(0);
});

test('regular users cannot view another employee document library', async ({ page }) => {
  await login(page, accounts.user);
  await gotoAndExpectTitle(page, '/documents/not-their-profile/', 'Employee documents');

  await expect(page.getByRole('alert')).toContainText('You cannot view this document library.');
  await expect(page.getByRole('table', { name: 'Documents' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add file' })).toHaveCount(0);
});
