import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiClient } from './index.ts';

/** A fake fetch that records the Request it receives and returns an empty 200 JSON. */
function recordingFetch(sink: Request[]): typeof globalThis.fetch {
  return async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    sink.push(request);
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

test('attaches a Bearer token and targets the configured baseUrl', async () => {
  const calls: Request[] = [];
  const client = createApiClient({
    baseUrl: 'http://api.test',
    getToken: () => 'my-token',
    fetch: recordingFetch(calls),
  });

  await client.GET('/v1/auth/me');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.get('authorization'), 'Bearer my-token');
  assert.match(calls[0].url, /^http:\/\/api\.test\/v1\/auth\/me/);
});

test('omits Authorization when no token is available', async () => {
  const calls: Request[] = [];
  const client = createApiClient({
    baseUrl: 'http://api.test',
    getToken: () => null,
    fetch: recordingFetch(calls),
  });

  await client.GET('/health/liveness');

  assert.equal(calls[0].headers.get('authorization'), null);
});
