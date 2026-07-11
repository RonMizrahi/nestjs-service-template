import { expect, test } from '@playwright/test';
import { mockApi } from './helpers';

test.describe('authentication', () => {
  test('redirects unauthenticated visitors to the login page', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs in and lands on the dashboard', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');

    await page.getByLabel('Email').fill('ada@example.dev');
    await page.getByLabel('Password').fill('correct-horse-battery');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('profile-panel')).toBeVisible();
    await expect(page.getByTestId('profile-email')).toHaveText('ada@example.dev');
  });

  test('shows an error on invalid credentials', async ({ page }) => {
    await mockApi(page, { login: 'invalid' });
    await page.goto('/');

    await page.getByLabel('Email').fill('nobody@example.dev');
    await page.getByLabel('Password').fill('wrong');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-form')).toBeVisible();
  });
});
