import { expect, test } from '@playwright/test';
import { login, mockApi } from './helpers';

test.describe('dashboard', () => {
  test('shows liveness and readiness up', async ({ page }) => {
    await mockApi(page);
    await login(page);

    const health = page.getByTestId('health-panel');
    await expect(health).toContainText('Liveness up');
    await expect(health).toContainText('Readiness up');
  });

  test('lists users for an admin token', async ({ page }) => {
    await mockApi(page, { users: 'ok' });
    await login(page);

    await expect(page.getByTestId('users-list')).toContainText('grace@example.dev');
  });

  test('shows a requires-admin message when the users endpoint is forbidden', async ({ page }) => {
    await mockApi(page, { users: 'forbidden' });
    await login(page);

    await expect(page.getByTestId('users-forbidden')).toBeVisible();
  });
});
