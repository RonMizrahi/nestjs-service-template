import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

/** Imperative caching: get-or-compute and targeted invalidation. */
@Injectable()
export class AppCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Returns the cached value or computes+stores it.
   * @param ttlMs Time to live in milliseconds (cache-manager v6+ semantics).
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const hit = await this.cache.get<T>(key);
    // v6+ returns undefined (not null) on a miss
    if (hit !== undefined && hit !== null) return hit;
    const value = await factory();
    await this.cache.set(key, value, ttlMs);
    return value;
  }

  /** Removes one cached key. */
  async evict(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
