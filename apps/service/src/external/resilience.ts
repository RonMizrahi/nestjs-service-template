// cockatiel is ESM-only — loading it from this CJS build relies on native
// require(esm), stable since Node 22.12 (enforced by "engines": ">=24")
import {
  circuitBreaker,
  ConsecutiveBreaker,
  ExponentialBackoff,
  handleAll,
  IPolicy,
  retry,
  timeout,
  TimeoutStrategy,
  wrap,
} from 'cockatiel';

/** Per-dependency tuning knobs — defaults suit a typical HTTP dependency. */
export interface ResiliencePolicyOptions {
  maxRetryAttempts?: number;
  initialBackoffMs?: number;
  consecutiveFailures?: number;
  halfOpenAfterMs?: number;
  timeoutMs?: number;
}

/**
 * Builds the standard resilience pipeline: retry → circuit breaker → timeout.
 * Create ONE policy per external dependency — the breaker state must be shared
 * across calls, never rebuilt per request.
 */
export function createResiliencePolicy(options: ResiliencePolicyOptions = {}): IPolicy {
  return wrap(
    retry(handleAll, {
      maxAttempts: options.maxRetryAttempts ?? 3,
      backoff: new ExponentialBackoff({ initialDelay: options.initialBackoffMs ?? 128 }),
    }),
    circuitBreaker(handleAll, {
      halfOpenAfter: options.halfOpenAfterMs ?? 10_000,
      breaker: new ConsecutiveBreaker(options.consecutiveFailures ?? 5),
    }),
    // cooperative: the AbortSignal reaches the HTTP call, which really cancels
    timeout(options.timeoutMs ?? 2_000, TimeoutStrategy.Cooperative),
  );
}
