import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';

describe('Auth flow (integration, real Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication<App>;

  const email = `${crypto.randomUUID()}@example.dev`;
  const password = 'correct-horse-battery';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    const { AppModule } =
      jest.requireActual<typeof import('../src/app.module')>('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it('registers → logs in → reads own profile (happy path)', async () => {
    const registered = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password })
      .expect(201);
    expect(registered.body).toHaveProperty('accessToken');

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const { accessToken } = login.body as { accessToken: string };

    const me = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ email, roles: ['user'] });
  });

  it('rejects a duplicate registration with 409', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password })
      .expect(409);
  });

  it('rejects invalid registration input with 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });

  it('rejects a wrong password with 401', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects /me without a token with 401', async () => {
    await request(app.getHttpServer()).get('/v1/auth/me').expect(401);
  });

  it('rejects /me with a tampered token with 401', async () => {
    await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer tampered.token.value')
      .expect(401);
  });

  it('rejects a token signed with the right secret but a foreign issuer', async () => {
    const { JwtService } = jest.requireActual<typeof import('@nestjs/jwt')>('@nestjs/jwt');
    const foreign = new JwtService({
      secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me-32-chars!!',
      signOptions: { issuer: 'some-other-service', expiresIn: '5m' },
    });
    const token = await foreign.signAsync({ sub: crypto.randomUUID(), email, roles: ['admin'] });

    await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
