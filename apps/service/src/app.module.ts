import { ClassSerializerInterceptor, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { trace } from '@opentelemetry/api';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CachingModule } from './cache/caching.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard';
import { TrimPipe } from './common/pipes/trim.pipe';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validateEnv, type Env } from './config/env.schema';
import { ExternalModule } from './external/external.module';
import { HealthModule } from './health/health.module';
import { ObservabilityModule } from './observability/observability.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        type: 'postgres' as const,
        url: config.get('DATABASE_URL', { infer: true }),
        autoLoadEntities: true,
        synchronize: false, // schema evolves via migrations only
        migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
        migrationsRun: true,
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: seconds(1), limit: 10 },
        { name: 'long', ttl: seconds(60), limit: 100 },
      ],
    }),
    CachingModule,
    ExternalModule,
    HealthModule,
    ObservabilityModule,
    UsersModule,
    AuthModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req, res) => {
            const incoming = req.headers['x-request-id'];
            const requestId = typeof incoming === 'string' ? incoming : randomUUID();
            res.setHeader('x-request-id', requestId);
            return requestId;
          },
          customProps: (req) => {
            const span = trace.getActiveSpan()?.spanContext();
            return {
              correlationId: req.id,
              // correlate logs ↔ traces when OTel is enabled
              ...(span ? { trace_id: span.traceId, span_id: span.spanId } : {}),
            };
          },
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
  ],
  providers: [
    // trims string route/query params BEFORE validation sees them
    { provide: APP_PIPE, useClass: TrimPipe },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    },
    // catch-all first, specific second — Nest picks the last matching filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    // guard order: throttle before auth (brute force blocked pre-auth), then coarse roles, then fine permissions
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
