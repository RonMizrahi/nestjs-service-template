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

  it('boots the module graph and serves HTTP (unknown route → 404)', async () => {
    await request(app.getHttpServer())
      .get(`/unknown-${crypto.randomUUID()}`)
      .expect(404);
  });
});
