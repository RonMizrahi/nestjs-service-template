import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { NodeSDK } from '@opentelemetry/sdk-node';

/*
 * OTel bootstrap — preloaded BEFORE Nest (node --require ./dist/tracing) so the
 * auto-instrumentations can patch http/express/pg/redis on first import.
 * Runs before DI/ConfigService exists → the sanctioned process.env exception.
 */
if (process.env.OTEL_ENABLED === 'true') {
  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'nestjs-service-template',
    // OTLP over http/proto — endpoint from OTEL_EXPORTER_OTLP_ENDPOINT (default localhost:4318)
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
  process.once('SIGTERM', () => void sdk.shutdown());
}
