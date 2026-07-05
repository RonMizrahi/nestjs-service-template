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
});
