import { CacheModule } from '@nestjs/cache-manager';
import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import type { Env } from '../config/env.schema';
import { AppCacheService } from './app-cache.service';

/**
 * Injection token for the readiness-probe store: a dedicated Keyv instance with
 * throwOnErrors enabled (keyv AND @keyv/redis swallow errors by default, which
 * would make an outage invisible). The main cache stays fail-open on purpose.
 */
export const CACHE_PROBE = Symbol('CACHE_PROBE');

/** Builds a Keyv store: Redis when a URL is given, in-memory otherwise. */
function buildStore(redisUrl: string | undefined, namespace: string, throwOnErrors: boolean): Keyv {
  return redisUrl
    ? new Keyv({ store: new KeyvRedis(redisUrl, { throwOnErrors }), namespace, throwOnErrors })
    : new Keyv({ namespace, throwOnErrors });
}

/**
 * Keyv-backed cache (cache-manager v6+ API): Redis when REDIS_URL is set,
 * in-memory otherwise. TTL is in MILLISECONDS.
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ttl: config.get('CACHE_TTL_MS', { infer: true }),
        stores: [buildStore(config.get('REDIS_URL', { infer: true }), 'app', false)],
      }),
    }),
  ],
  providers: [
    AppCacheService,
    {
      provide: CACHE_PROBE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Keyv =>
        buildStore(config.get('REDIS_URL', { infer: true }), 'health', true),
    },
  ],
  exports: [AppCacheService, CACHE_PROBE],
})
export class CachingModule implements OnApplicationShutdown {
  constructor(@Inject(CACHE_PROBE) private readonly probe: Keyv) {}

  /** Disconnects the probe store — Nest manages no lifecycle for raw Keyv providers. */
  async onApplicationShutdown(): Promise<void> {
    await this.probe.disconnect();
  }
}
