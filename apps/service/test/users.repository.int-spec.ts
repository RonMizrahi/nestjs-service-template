import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DuplicateResourceException } from '../src/common/exceptions/app.exception';
import { Role } from '../src/common/enums/role.enum';
import { User } from '../src/users/entities/user.entity';
import { UsersRepository } from '../src/users/users.repository';

describe('UsersRepository (integration, real Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let repository: UsersRepository;

  const randomEmail = (): string => `${crypto.randomUUID()}@example.dev`;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18-alpine').start();

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          autoLoadEntities: true,
          synchronize: true, // tests own their throwaway schema
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UsersRepository],
    }).compile();

    repository = moduleRef.get(UsersRepository);
  }, 120_000);

  afterAll(async () => {
    await moduleRef.close();
    await container.stop();
  });

  it('creates and reads back a user (happy path)', async () => {
    const email = randomEmail();

    const created = await repository.create({ email, passwordHash: 'hash' });

    expect(created.id).toEqual(expect.any(String));
    expect(created.roles).toEqual([Role.User]);
    await expect(repository.findById(created.id)).resolves.toMatchObject({ email });
    await expect(repository.findByEmail(email)).resolves.toMatchObject({ id: created.id });
  });

  it('updates a user, returns the fresh row, and bumps updatedAt', async () => {
    const created = await repository.create({ email: randomEmail(), passwordHash: 'hash' });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = await repository.update(created.id, { isActive: false });

    expect(updated?.isActive).toBe(false);
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
  });

  it('deletes a user', async () => {
    const created = await repository.create({ email: randomEmail(), passwordHash: 'hash' });

    await expect(repository.delete(created.id)).resolves.toBe(true);
    await expect(repository.findById(created.id)).resolves.toBeNull();
    await expect(repository.delete(created.id)).resolves.toBe(false);
  });

  it('translates the unique email constraint into a 409 domain exception', async () => {
    const email = randomEmail();
    await repository.create({ email, passwordHash: 'hash' });

    await expect(repository.create({ email, passwordHash: 'other' })).rejects.toBeInstanceOf(
      DuplicateResourceException,
    );
  });
});
