import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import type { Env } from './config/env.schema';
import { kafkaOptions } from './messaging/kafka.options';

/** Boots the HTTP application with shared configuration + Swagger, then listens. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  configureApp(app);
  setupSwagger(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  // Kafka consumers (@EventPattern) run as a microservice sharing this app's DI container
  if (config.get('MESSAGING_DRIVER', { infer: true }) === 'kafka') {
    app.connectMicroservice<MicroserviceOptions>(kafkaOptions(config, 'server'));
    await app.startAllMicroservices();
  }
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
