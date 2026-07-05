import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Application bootstrap (smoke)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
});
