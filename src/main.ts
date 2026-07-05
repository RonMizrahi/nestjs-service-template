import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

/**
 * Boots the HTTP application: structured logging, security headers, CORS,
 * URI versioning, OpenAPI docs, and graceful shutdown hooks.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

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

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const openApiConfig = new DocumentBuilder()
      .setTitle('NestJS Service Template')
      .setDescription('Production-grade service template API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs/json' });
  }

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
