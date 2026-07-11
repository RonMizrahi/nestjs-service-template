import { Cache } from '@nestjs/cache-manager';
import { AppCacheService } from './app-cache.service';

describe('AppCacheService', () => {
  const key = `k-${crypto.randomUUID()}`;
  const get = jest.fn();
  const set = jest.fn(() => Promise.resolve());
  const del = jest.fn(() => Promise.resolve());
  const service = new AppCacheService({ get, set, del } as unknown as Cache);

  beforeEach(() => jest.clearAllMocks());

  it('computes and stores on a miss (undefined semantics, happy path)', async () => {
    get.mockResolvedValueOnce(undefined); // v6+ misses are undefined, not null
    const factory = jest.fn(() => Promise.resolve('computed'));

    await expect(service.getOrSet(key, factory, 5_000)).resolves.toBe('computed');

    expect(factory).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(key, 'computed', 5_000);
  });

  it('returns the cached value without recomputing on a hit', async () => {
    get.mockResolvedValueOnce('cached');
    const factory = jest.fn(() => Promise.resolve('computed'));

    await expect(service.getOrSet(key, factory)).resolves.toBe('cached');

    expect(factory).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('evicts a key', async () => {
    await service.evict(key);
    expect(del).toHaveBeenCalledWith(key);
  });
});
