import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import type { Keyv } from 'keyv';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CACHE_PROBE } from '../cache/caching.module';

const PROBE_TTL_MS = 1_000;

/**
 * Cache readiness via a real set+get roundtrip against the dedicated probe
 * store (throwOnErrors) — the main cache swallows failures by design, so
 * probing through CACHE_MANAGER would always report up.
 */
@Injectable()
export class CacheHealthIndicator {
  constructor(
    @InjectPinoLogger(CacheHealthIndicator.name) private readonly logger: PinoLogger,
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(CACHE_PROBE) private readonly probe: Keyv,
  ) {}

  /** Reports up/down for the configured cache store. */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const probeKey = `probe:${crypto.randomUUID()}`;
      await this.probe.set(probeKey, '1', PROBE_TTL_MS);
      await this.probe.get(probeKey);
      return indicator.up();
    } catch (error) {
      // Raw driver errors can leak internal hosts/auth state on the public endpoint — log, don't expose.
      this.logger.error({ err: error }, 'Cache readiness probe failed');
      return indicator.down({ message: 'cache unreachable' });
    }
  }
}
