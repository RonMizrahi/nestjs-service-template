import { BrokenCircuitError } from 'cockatiel';
import { createResiliencePolicy } from './resilience';

// tiny knobs so failure paths run in milliseconds, not the production backoffs
const FAST = {
  maxRetryAttempts: 2,
  initialBackoffMs: 1,
  consecutiveFailures: 2,
  halfOpenAfterMs: 60_000,
  timeoutMs: 50,
};

describe('createResiliencePolicy', () => {
  it('retries transient failures until success (happy path)', async () => {
    // breaker threshold above the failure count — the retries must not trip it
    const policy = createResiliencePolicy({ ...FAST, maxRetryAttempts: 5, consecutiveFailures: 10 });
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'))
      .mockResolvedValue('ok');

    await expect(policy.execute(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('opens the circuit after consecutive failures and fails fast', async () => {
    const policy = createResiliencePolicy(FAST);
    const failing = jest.fn(() => Promise.reject(new Error('down')));

    // burn through enough consecutive failures to trip the ConsecutiveBreaker(2)
    await expect(policy.execute(failing)).rejects.toThrow();
    await expect(policy.execute(failing)).rejects.toThrow();

    failing.mockClear();
    await expect(policy.execute(failing)).rejects.toBeInstanceOf(BrokenCircuitError);
    expect(failing).not.toHaveBeenCalled();
  });

  it('signals cancellation to the task at the timeout', async () => {
    const policy = createResiliencePolicy({ ...FAST, maxRetryAttempts: 0 });

    await expect(
      policy.execute(
        ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('cancelled by timeout')));
          }),
      ),
    ).rejects.toThrow();
  });
});
