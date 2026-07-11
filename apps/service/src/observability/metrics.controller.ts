import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';

/** Prometheus scrape endpoint — public (scrapers don't authenticate) and unversioned. */
@ApiExcludeController()
@Public()
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController extends PrometheusController {
  @Get()
  index(@Res({ passthrough: true }) response: Response): Promise<string> {
    return super.index(response);
  }
}
