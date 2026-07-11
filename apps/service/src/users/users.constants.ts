/** Cache key for the users list — evicted on any user mutation. */
export const USERS_LIST_CACHE_KEY = 'users:list';

/** How long the users list may be served from cache. */
export const USERS_LIST_CACHE_TTL_MS = 10_000;
