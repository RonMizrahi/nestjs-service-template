import { HealthIndicatorService } from '@nestjs/terminus';
import type { Keyv } from 'keyv';
import type { PinoLogger } from 'nestjs-pino';
import { CacheHealthIndicator } from './cache.health';

describe('CacheHealthIndicator', () => {
  const up = jest.fn(() => ({ cache: { status: 'up' } }));
  const down = jest.fn((meta: unknown) => ({ cache: { status: 'down', meta } }));
  const healthIndicatorService = {
    check: jest.fn(() => ({ up, down })),
  } as unknown as HealthIndicatorService;
  const logError = jest.fn();
  const logger = { error: logError } as unknown as PinoLogger;

  beforeEach(() => jest.clearAllMocks());

  it('reports up when the roundtrip succeeds (happy path)', async () => {
    const probe = {
      set: jest.fn(() => Promise.resolve(true)),
      get: jest.fn(() => Promise.resolve('1')),
    } as unknown as Keyv;
    const indicator = new CacheHealthIndicator(logger, healthIndicatorService, probe);

    const result = await indicator.isHealthy('cache');

    expect(result).toEqual({ cache: { status: 'up' } });
  });

  it('reports down with a generic message when the probe store throws', async () => {
    const driverError = new Error('NOAUTH redis://10.0.0.5:6379');
    const probe = {
      set: jest.fn(() => Promise.reject(driverError)),
      get: jest.fn(),
    } as unknown as Keyv;
    const indicator = new CacheHealthIndicator(logger, healthIndicatorService, probe);

    const result = await indicator.isHealthy('cache');

    // The raw driver error is logged server-side but never exposed on the public endpoint.
    expect(logError).toHaveBeenCalledWith({ err: driverError }, 'Cache readiness probe failed');
    expect(down).toHaveBeenCalledWith({ message: 'cache unreachable' });
    expect(result).toMatchObject({ cache: { status: 'down' } });
  });
});
