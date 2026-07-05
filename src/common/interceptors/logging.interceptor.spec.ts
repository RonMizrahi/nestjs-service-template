import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  const interceptor = new LoggingInterceptor();
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ method: 'GET', url: '/v1/things' }) }),
    getClass: () => ({ name: 'ThingsController' }),
    getHandler: () => ({ name: 'findAll' }),
  } as unknown as ExecutionContext;
  const expectedLine = /^GET \/v1\/things ThingsController\.findAll \+\d+ms$/;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => logSpy.mockRestore());

  it('logs method, url, handler, and latency after completion (happy path)', async () => {
    const next: CallHandler = { handle: () => of('ok') };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(expectedLine));
  });

  it('still logs latency when the handler throws', async () => {
    const next: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('boom');
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(expectedLine));
  });
});
