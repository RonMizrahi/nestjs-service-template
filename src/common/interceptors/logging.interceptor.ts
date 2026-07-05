import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { finalize, Observable } from 'rxjs';

/** Logs per-handler latency with the resolved controller/handler names. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const { method, url } = context.switchToHttp().getRequest<Request>();
    const handler = `${context.getClass().name}.${context.getHandler().name}`;

    return next
      .handle()
      // finalize (not tap) so failing requests get timed too
      .pipe(finalize(() => this.logger.log(`${method} ${url} ${handler} +${Date.now() - start}ms`)));
  }
}
