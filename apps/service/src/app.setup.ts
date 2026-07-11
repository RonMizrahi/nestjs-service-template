import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
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

/** Builds the OpenAPI document from the app's controller metadata (no listen needed). */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const openApiConfig = new DocumentBuilder()
    .setTitle('NestJS Service Template')
    .setDescription('Production-grade service template API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, openApiConfig);
}

/** Mounts Swagger UI at /docs (+ /docs/json) when SWAGGER_ENABLED. */
export function setupSwagger(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  if (!config.get('SWAGGER_ENABLED', { infer: true })) return;

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs/json' });
}
