import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { ExternalApiService } from './external-api.service';
import { EXTERNAL_API_POLICY } from './external.constants';
import { ExternalController } from './external.controller';
import { createResiliencePolicy } from './resilience';

/** Demo external dependency — axios via @nestjs/axios behind a cockatiel policy. */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        baseURL: config.get('EXTERNAL_API_URL', { infer: true }),
      }),
    }),
  ],
  controllers: [ExternalController],
  providers: [
    ExternalApiService,
    // one policy instance per dependency — breaker state spans all calls
    { provide: EXTERNAL_API_POLICY, useFactory: () => createResiliencePolicy() },
  ],
})
export class ExternalModule {}
