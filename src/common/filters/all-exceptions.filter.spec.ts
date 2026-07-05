import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const correlationId = crypto.randomUUID();
  let capturedBody: unknown;
  const reply = jest.fn((_res: unknown, body: unknown, _status: number): void => {
    capturedBody = body;
  });
  const adapterHost = { httpAdapter: { reply } } as unknown as HttpAdapterHost;
  const filter = new AllExceptionsFilter(adapterHost);

  const response = {};
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'GET', url: '/v1/boom', id: correlationId }),
    }),
  } as unknown as ArgumentsHost;

  it('maps an unknown error to a clean 500 without leaking internals', () => {
    filter.catch(new Error('secret internal detail'), host);

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        path: '/v1/boom',
        correlationId,
      }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(JSON.stringify(capturedBody)).not.toContain('secret internal detail');
  });
});
