import { HealthCheckResult, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { CacheHealthIndicator } from './cache.health';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const okResult = { status: 'ok', info: {}, error: {}, details: {} } as HealthCheckResult;
  const check = jest.fn((indicators: (() => unknown)[]) => {
    indicators.forEach((run) => run());
    return Promise.resolve(okResult);
  });
  const pingCheck = jest.fn();
  const isHealthy = jest.fn();
  const db = { pingCheck } as unknown as TypeOrmHealthIndicator;
  const cache = { isHealthy } as unknown as CacheHealthIndicator;
  const controller = new HealthController({ check } as unknown as HealthCheckService, db, cache);

  beforeEach(() => jest.clearAllMocks());

  it('liveness runs zero dependency checks (happy path)', async () => {
    await expect(controller.liveness()).resolves.toBe(okResult);
    expect(check).toHaveBeenCalledWith([]);
  });

  it('readiness checks database ping and cache roundtrip (happy path)', async () => {
    await expect(controller.readiness()).resolves.toBe(okResult);
    expect(pingCheck).toHaveBeenCalledWith('database');
    expect(isHealthy).toHaveBeenCalledWith('cache');
  });
});
