import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { DuplicateResourceException } from '../common/exceptions/app.exception';
import { Role } from '../common/enums/role.enum';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  const id = crypto.randomUUID();
  const email = `${crypto.randomUUID()}@example.dev`;
  const user: Partial<User> = { id, email, roles: [Role.User] };

  const typeormRepo = {
    create: jest.fn((data: Partial<User>) => data),
    save: jest.fn((data: Partial<User>) => Promise.resolve({ ...data, id })),
    find: jest.fn(() => Promise.resolve([user])),
    findOneBy: jest.fn(() => Promise.resolve(user)),
    preload: jest.fn((data: Partial<User>) => Promise.resolve({ ...user, ...data })),
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
  };

  let repository: UsersRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersRepository, { provide: getRepositoryToken(User), useValue: typeormRepo }],
    }).compile();
    repository = moduleRef.get(UsersRepository);
  });

  it('creates a user (happy path)', async () => {
    const created = await repository.create({ email, passwordHash: 'hash' });

    expect(typeormRepo.create).toHaveBeenCalledWith({ email, passwordHash: 'hash' });
    expect(created.id).toBe(id);
  });

  it('finds all users', async () => {
    await expect(repository.findAll()).resolves.toEqual([user]);
  });

  it('finds a user by id', async () => {
    await expect(repository.findById(id)).resolves.toEqual(user);
    expect(typeormRepo.findOneBy).toHaveBeenCalledWith({ id });
  });

  it('finds a user by email', async () => {
    await expect(repository.findByEmail(email)).resolves.toEqual(user);
    expect(typeormRepo.findOneBy).toHaveBeenCalledWith({ email });
  });

  it('updates via preload+save so @UpdateDateColumn is applied', async () => {
    await expect(repository.update(id, { isActive: false })).resolves.toMatchObject({
      id,
      isActive: false,
    });
    expect(typeormRepo.preload).toHaveBeenCalledWith({ id, isActive: false });
    expect(typeormRepo.save).toHaveBeenCalled();
  });

  it('ignores a stray id inside the update payload', async () => {
    await repository.update(id, { id: crypto.randomUUID(), isActive: false });
    expect(typeormRepo.preload).toHaveBeenCalledWith({ id, isActive: false });
  });

  it('returns null when updating a missing user', async () => {
    typeormRepo.preload.mockResolvedValueOnce(undefined as unknown as User);
    await expect(repository.update(id, { isActive: false })).resolves.toBeNull();
    expect(typeormRepo.save).not.toHaveBeenCalled();
  });

  it('translates a unique violation into DuplicateResourceException', async () => {
    const driverError = Object.assign(new Error('duplicate key'), { code: '23505' });
    typeormRepo.save.mockRejectedValueOnce(
      new QueryFailedError('INSERT INTO users', [], driverError),
    );

    await expect(repository.create({ email, passwordHash: 'hash' })).rejects.toBeInstanceOf(
      DuplicateResourceException,
    );
  });

  it('reports deletion success by affected rows', async () => {
    await expect(repository.delete(id)).resolves.toBe(true);
    typeormRepo.delete.mockResolvedValueOnce({ affected: 0 });
    await expect(repository.delete(id)).resolves.toBe(false);
  });
});
