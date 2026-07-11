import { Global, Module } from '@nestjs/common';
import { makeHistogramProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';
import { OpenTelemetryModule } from 'nestjs-otel';
import { MetricsController } from './metrics.controller';
import { EXTERNAL_API_DURATION_METRIC } from './observability.constants';

const externalApiDuration = makeHistogramProvider({
  name: EXTERNAL_API_DURATION_METRIC,
  help: 'External API call duration in seconds',
  labelNames: ['operation', 'outcome'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

/** Prometheus /metrics + OTel @Span support; custom metrics exported app-wide. */
@Global()
@Module({
  imports: [
    PrometheusModule.register({ controller: MetricsController }),
    OpenTelemetryModule.forRoot(),
  ],
  providers: [externalApiDuration],
  exports: [externalApiDuration],
})
export class ObservabilityModule {}
