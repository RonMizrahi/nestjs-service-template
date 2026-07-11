import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';

export type { paths } from './schema';

export interface ApiClientOptions {
  /** Base URL of the service, e.g. `http://localhost:3000`. */
  baseUrl: string;
  /** Returns the current access token; attached as a Bearer header when present. */
  getToken?: () => string | null | undefined;
  /** Custom fetch (tests / SSR); defaults to the global `fetch`. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Creates a fully-typed client for the NestJS service. Paths, params and responses
 * are checked against the generated OpenAPI schema.
 */
export function createApiClient({ baseUrl, getToken, fetch }: ApiClientOptions) {
  const client = createClient<paths>({ baseUrl, fetch });

  if (getToken) {
    const authMiddleware: Middleware = {
      onRequest({ request }) {
        const token = getToken();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    };
    client.use(authMiddleware);
  }

  return client;
}
