import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { PasswordService } from '../src/auth/password.service';
import { Role } from '../src/common/enums/role.enum';
import { UsersRepository } from '../src/users/users.repository';

describe('Users resource (integration, RBAC + CRUD)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;

  const randomEmail = (): string => `${crypto.randomUUID()}@example.dev`;
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

    // seed an admin directly (no admin-creation endpoint by design)
    const adminEmail = randomEmail();
    const passwordHash = await app.get(PasswordService).hash(password);
    await app.get(UsersRepository).create({
      email: adminEmail,
      passwordHash,
      roles: [Role.Admin],
    });
    adminToken = await login(adminEmail);

    const userEmail = randomEmail();
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email: userEmail, password })
      .expect(201);
    userToken = await login(userEmail);
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  }

  it('admin can run the full CRUD cycle (happy path)', async () => {
    const email = randomEmail();

    const created = await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, password })
      .expect(201);
    const createdId = (created.body as { id: string }).id;
    expect(created.body).toMatchObject({ email, roles: ['user'], isActive: true });
    expect(created.body).not.toHaveProperty('passwordHash');

    const listed = await request(app.getHttpServer())
      .get('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(JSON.stringify(listed.body)).toContain(createdId);
    expect(JSON.stringify(listed.body)).not.toContain('passwordHash');

    await request(app.getHttpServer())
      .get(`/v1/users/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const patched = await request(app.getHttpServer())
      .patch(`/v1/users/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);
    expect(patched.body).toMatchObject({ isActive: false });

    await request(app.getHttpServer())
      .delete(`/v1/users/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/users/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('rejects a non-admin with 403', async () => {
    await request(app.getHttpServer())
      .get('/v1/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('rejects anonymous access with 401', async () => {
    await request(app.getHttpServer()).get('/v1/users').expect(401);
  });

  it('rejects an invalid uuid with 400', async () => {
    await request(app.getHttpServer())
      .get('/v1/users/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('rejects a bare-string roles value with 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: randomEmail(), password, roles: 'admin' })
      .expect(400);
  });

  it('rejects a duplicate email with 409', async () => {
    const email = randomEmail();
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, password })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, password })
      .expect(409);
  });

  it('rejects an update onto a taken email with 409', async () => {
    const takenEmail = randomEmail();
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: takenEmail, password })
      .expect(201);
    const other = await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: randomEmail(), password })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/v1/users/${(other.body as { id: string }).id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: takenEmail })
      .expect(409);
  });
});
