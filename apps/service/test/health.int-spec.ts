import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';

describe('Health probes (integration, real Postgres + Redis)', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedRedisContainer;
  let app: INestApplication<App>;

  beforeAll(async () => {
    [postgres, redis] = await Promise.all([
      new PostgreSqlContainer('postgres:18-alpine').start(),
      new RedisContainer('redis:8-alpine').start(),
    ]);
    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.REDIS_URL = redis.getConnectionUrl();

    const { AppModule } =
      jest.requireActual<typeof import('../src/app.module')>('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await Promise.all([postgres.stop(), redis.stop()]);
    delete process.env.REDIS_URL; // don't leak Redis config into later suites
  });

  it('liveness responds 200 without touching dependencies (happy path)', async () => {
    const response = await request(app.getHttpServer()).get('/health/liveness').expect(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('readiness reports database and cache up', async () => {
    const response = await request(app.getHttpServer()).get('/health/readiness').expect(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' }, cache: { status: 'up' } },
    });
  });

  it('health endpoints are public and version-neutral (no /v1 prefix, no token)', async () => {
    await request(app.getHttpServer()).get('/v1/health/liveness').expect(404);
  });
});
