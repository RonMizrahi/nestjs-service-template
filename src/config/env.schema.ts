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
  REDIS_URL: z.string().optional(), // unset → in-memory cache (dev/tests without Redis)
  CACHE_TTL_MS: z.coerce.number().int().positive().default(30_000),
  MESSAGING_DRIVER: z.enum(['kafka', 'sqs', 'none']).default('none'),
  KAFKA_BROKERS: z.string().default('localhost:9092'), // comma-separated
  KAFKA_CLIENT_ID: z.string().default('nestjs-service-template'),
  KAFKA_GROUP_ID: z.string().default('nestjs-service-template'),
  SQS_QUEUE_URL: z.string().optional(), // required when MESSAGING_DRIVER=sqs
  SQS_REGION: z.string().default('us-east-1'),
  SQS_ENDPOINT: z.string().optional(), // e.g. http://localhost:4566 for LocalStack
  EXTERNAL_API_URL: z.string().default('https://jsonplaceholder.typicode.com'),
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
  if (raw.MESSAGING_DRIVER === 'sqs' && !raw.SQS_QUEUE_URL) {
    throw new Error(
      'Invalid environment configuration — SQS_QUEUE_URL is required when MESSAGING_DRIVER=sqs',
    );
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
