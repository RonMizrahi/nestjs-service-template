import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  it('applies defaults for a minimal environment (happy path)', () => {
    const env = validateEnv({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGINS).toBe('*');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.SWAGGER_ENABLED).toBe(true);
  });

  it('parses SWAGGER_ENABLED from its string form', () => {
    expect(validateEnv({ SWAGGER_ENABLED: 'false' }).SWAGGER_ENABLED).toBe(false);
  });

  it('coerces PORT from its string form', () => {
    expect(validateEnv({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/Invalid environment/);
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => validateEnv({ PORT: 'not-a-port' })).toThrow(/Invalid environment/);
  });

  it('rejects a PORT above 65535', () => {
    expect(() => validateEnv({ PORT: '655350' })).toThrow(/Invalid environment/);
  });

  it('defaults MESSAGING_DRIVER to none', () => {
    expect(validateEnv({}).MESSAGING_DRIVER).toBe('none');
  });

  it('accepts only the literal OTEL_ENABLED spellings the tracing preload understands', () => {
    expect(validateEnv({ OTEL_ENABLED: 'true' }).OTEL_ENABLED).toBe(true);
    expect(validateEnv({ OTEL_ENABLED: 'false' }).OTEL_ENABLED).toBe(false);
    // '1'/'yes' would pass a lenient stringbool but be ignored by tracing.ts — fail fast instead
    expect(() => validateEnv({ OTEL_ENABLED: '1' })).toThrow(/Invalid environment/);
  });

  it('requires SQS_QUEUE_URL when the sqs driver is selected', () => {
    expect(() => validateEnv({ MESSAGING_DRIVER: 'sqs' })).toThrow(/SQS_QUEUE_URL is required/);
    expect(
      validateEnv({
        MESSAGING_DRIVER: 'sqs',
        SQS_QUEUE_URL: 'http://localhost:4566/000000000000/q',
      }).MESSAGING_DRIVER,
    ).toBe('sqs');
  });

  it('requires explicit DATABASE_URL and JWT_SECRET in production', () => {
    const secret = crypto.randomUUID().repeat(2);
    const url = 'postgres://u:p@db:5432/app';

    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL is required/);
    expect(() => validateEnv({ NODE_ENV: 'production', DATABASE_URL: url })).toThrow(
      /JWT_SECRET is required/,
    );
    expect(
      validateEnv({ NODE_ENV: 'production', DATABASE_URL: url, JWT_SECRET: secret }).DATABASE_URL,
    ).toBe(url);
  });
});
