import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { CacheHealthIndicator } from './cache.health';

/**
 * Separate probes: liveness never checks dependencies (a dependency blip must
 * not restart the pod); readiness checks what the service needs to serve.
 */
@ApiTags('health')
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly cache: CacheHealthIndicator,
  ) {}

  @Get('liveness')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe — process is up, no dependency checks' })
  @ApiOkResponse({ description: 'Process alive' })
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — database + cache reachable' })
  @ApiOkResponse({ description: 'Ready to serve traffic' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.cache.isHealthy('cache'),
    ]);
  }
}
