import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Env } from './config/env.schema';

/**
 * Applies the HTTP hardening + versioning shared by main.ts and integration tests.
 * @param app The created Nest application.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());
  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });
  const allowAllOrigins = corsOrigins === '*';
  app.enableCors({
    origin: allowAllOrigins ? true : corsOrigins.split(',').map((origin) => origin.trim()),
    // credentials + reflected wildcard origin is unsafe — only allow with an explicit allowlist
    credentials: !allowAllOrigins,
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
}

/** Mounts Swagger UI at /docs (+ /docs/json) when SWAGGER_ENABLED. */
export function setupSwagger(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  if (!config.get('SWAGGER_ENABLED', { infer: true })) return;

  const openApiConfig = new DocumentBuilder()
    .setTitle('NestJS Service Template')
    .setDescription('Production-grade service template API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs/json' });
}
