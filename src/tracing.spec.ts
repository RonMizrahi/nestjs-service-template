const mockStart = jest.fn();
const mockNodeSdk = jest.fn(() => ({ start: mockStart, shutdown: jest.fn() }));

jest.mock('@opentelemetry/sdk-node', () => ({ NodeSDK: mockNodeSdk }));
jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn(() => []),
}));
jest.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({ OTLPTraceExporter: jest.fn() }));

describe('tracing preload', () => {
  const original = process.env.OTEL_ENABLED;

  afterEach(() => {
    jest.clearAllMocks();
    if (original === undefined) delete process.env.OTEL_ENABLED;
    else process.env.OTEL_ENABLED = original;
  });

  it('starts the SDK when OTEL_ENABLED=true (happy path)', () => {
    process.env.OTEL_ENABLED = 'true';
    jest.isolateModules(() => jest.requireActual('./tracing'));

    expect(mockNodeSdk).toHaveBeenCalledWith(
      expect.objectContaining({ serviceName: 'nestjs-service-template' }),
    );
    expect(mockStart).toHaveBeenCalled();
  });

  it('stays inert when OTEL_ENABLED is unset', () => {
    delete process.env.OTEL_ENABLED;
    jest.isolateModules(() => jest.requireActual('./tracing'));

    expect(mockNodeSdk).not.toHaveBeenCalled();
  });
});
