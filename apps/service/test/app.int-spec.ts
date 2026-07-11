import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { App } from 'supertest/types';

describe('Application bootstrap (smoke)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication<App>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    // AppModule is loaded AFTER env is set — ConfigModule.forRoot captures
    // process.env when the module file is first imported.
    const { AppModule } =
      jest.requireActual<typeof import('../src/app.module')>('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it('boots the module graph and serves HTTP (unknown route → 404 envelope)', async () => {
    const path = `/unknown-${crypto.randomUUID()}`;
    const response = await request(app.getHttpServer()).get(path).expect(404);

    const body = response.body as Record<string, unknown>;
    expect(body).toMatchObject({
      statusCode: 404,
      error: 'NOT_FOUND',
      path,
    });
    expect(body.correlationId).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).toBe(body.correlationId);
  });

  it('serves Prometheus metrics publicly on the unversioned path (happy path)', async () => {
    const response = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(response.text).toContain('process_cpu_user_seconds_total');
    expect(response.text).toContain('app_external_api_duration_seconds');
  });
});
