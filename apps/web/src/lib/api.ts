import { createApiClient } from '@repo/api-client';

const TOKEN_KEY = 'access_token';

/** Reads the persisted access token (source of truth for the request auth header). */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Persists (or clears) the access token across reloads. */
export function storeToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Shared typed client; the Bearer header is filled from localStorage on every request. */
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  getToken: getStoredToken,
});
