import { z } from 'zod';

/** Single source of truth for environment configuration — parsed once, fail-fast on boot. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  CORS_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SWAGGER_ENABLED: z.stringbool().default(true),
  DATABASE_URL: z.string().default('postgres://app:app@localhost:5432/app'),
  JWT_SECRET: z.string().min(32).default('dev-only-secret-change-me-32-chars!!'),
  JWT_EXPIRES_IN: z.string().default('15m'),
});

/** Typed shape of the validated environment — use with `ConfigService<Env, true>`. */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates raw environment variables against the schema.
 * @param raw Unvalidated process.env-shaped record (ConfigModule contract).
 * @throws Error with a readable summary when validation fails.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  // dev-only defaults must never silently apply in production
  for (const key of ['DATABASE_URL', 'JWT_SECRET'] as const) {
    if (raw.NODE_ENV === 'production' && !raw[key]) {
      throw new Error(`Invalid environment configuration — ${key} is required in production`);
    }
  }
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return parsed.data;
}
