import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';

/**
 * Catch-all safety net: any non-HttpException becomes a clean 500 without
 * leaking internals, and is logged with its stack for diagnosis.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(`Unhandled exception on ${request.method} ${request.url}`, stack);

    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode: status,
        error: HttpStatus[status],
        message: 'Internal server error',
        path: request.url,
        timestamp: new Date().toISOString(),
        correlationId: request.id,
      },
      status,
    );
  }
}
