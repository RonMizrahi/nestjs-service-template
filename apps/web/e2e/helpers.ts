import { expect, type Page, type Route } from '@playwright/test';

// The SPA calls the API cross-origin (5173 -> 3000), so mocked responses must carry
// CORS headers and answer the preflight, or the browser blocks them.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
};

function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  if (route.request().method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: CORS_HEADERS });
  }
  return route.fulfill({
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

interface MockOptions {
  users?: 'ok' | 'forbidden';
  login?: 'ok' | 'invalid';
}

/**
 * Installs default API mocks. `users: 'forbidden'` makes GET /v1/users return 403;
 * `login: 'invalid'` makes POST /v1/auth/login return 401.
 */
export async function mockApi(page: Page, options: MockOptions = {}): Promise<void> {
  await page.route('**/v1/auth/login', (route) =>
    options.login === 'invalid'
      ? fulfillJson(route, { statusCode: 401, message: 'Invalid credentials' }, 401)
      : fulfillJson(route, { accessToken: 'test-token' }),
  );
  await page.route('**/v1/auth/me', (route) =>
    fulfillJson(route, {
      userId: 'u-1',
      email: 'ada@example.dev',
      roles: ['user'],
      permissions: ['users:read'],
    }),
  );
  await page.route('**/health/liveness', (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/health/readiness', (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/v1/users', (route) =>
    options.users === 'forbidden'
      ? fulfillJson(route, { statusCode: 403, message: 'Forbidden' }, 403)
      : fulfillJson(route, [
          {
            id: 'user-1',
            email: 'grace@example.dev',
            roles: ['admin'],
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
  );
}

/** Logs in through the UI and waits for the dashboard to render. */
export async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Email').fill('ada@example.dev');
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('profile-panel')).toBeVisible();
}
