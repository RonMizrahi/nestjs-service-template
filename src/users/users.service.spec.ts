import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { PasswordService } from '../auth/password.service';
import { ResourceNotFoundException } from '../common/exceptions/app.exception';
import { Role } from '../common/enums/role.enum';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const id = crypto.randomUUID();
  const email = `${crypto.randomUUID()}@example.dev`;
  const user: User = {
    id,
    email,
    passwordHash: 'stored-hash',
    roles: [Role.User],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const usersRepository = {
    create: jest.fn(() => Promise.resolve(user)),
    findAll: jest.fn(() => Promise.resolve([user])),
    findById: jest.fn(() => Promise.resolve<User | null>(user)),
    update: jest.fn(() => Promise.resolve<User | null>(user)),
    delete: jest.fn(() => Promise.resolve(true)),
  };
  const passwordService = { hash: jest.fn(() => Promise.resolve('new-hash')) };
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: PasswordService, useValue: passwordService },
        { provide: getLoggerToken(UsersService.name), useValue: logger },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('creates a user with a hashed password (happy path)', async () => {
    const result = await service.create({ email, password: 'plain', roles: [Role.Admin] });

    expect(passwordService.hash).toHaveBeenCalledWith('plain');
    expect(usersRepository.create).toHaveBeenCalledWith({
      email,
      passwordHash: 'new-hash',
      roles: [Role.Admin],
    });
    expect(result.id).toBe(id);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('lists users as response DTOs', async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('fetches one user', async () => {
    await expect(service.findById(id)).resolves.toMatchObject({ id, email });
  });

  it('throws 404 for a missing user', async () => {
    usersRepository.findById.mockResolvedValueOnce(null);
    await expect(service.findById(id)).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('updates a user', async () => {
    await expect(service.update(id, { isActive: false })).resolves.toMatchObject({ id });
    expect(usersRepository.update).toHaveBeenCalledWith(id, { isActive: false });
  });

  it('throws 404 when updating a missing user', async () => {
    usersRepository.update.mockResolvedValueOnce(null);
    await expect(service.update(id, {})).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('removes a user', async () => {
    await expect(service.remove(id)).resolves.toBeUndefined();
  });

  it('throws 404 when removing a missing user', async () => {
    usersRepository.delete.mockResolvedValueOnce(false);
    await expect(service.remove(id)).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});
