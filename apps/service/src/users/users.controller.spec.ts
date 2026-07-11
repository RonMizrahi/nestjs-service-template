import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  const id = crypto.randomUUID();
  const dto = { id, email: `${crypto.randomUUID()}@example.dev`, roles: [Role.User] };

  const usersService = {
    create: jest.fn(() => Promise.resolve(dto)),
    findAll: jest.fn(() => Promise.resolve([dto])),
    findById: jest.fn(() => Promise.resolve(dto)),
    update: jest.fn(() => Promise.resolve(dto)),
    remove: jest.fn(() => Promise.resolve(undefined)),
  };

  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        // CacheInterceptor on findAll resolves CACHE_MANAGER from this module
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn() } },
      ],
    }).compile();
    controller = moduleRef.get(UsersController);
  });

  it('dispatches create (happy path)', async () => {
    const body = { email: dto.email, password: 'correct-horse' };
    await expect(controller.create(body)).resolves.toEqual(dto);
    expect(usersService.create).toHaveBeenCalledWith(body);
  });

  it('dispatches findAll', async () => {
    await expect(controller.findAll()).resolves.toEqual([dto]);
  });

  it('dispatches findOne', async () => {
    await expect(controller.findOne(id)).resolves.toEqual(dto);
    expect(usersService.findById).toHaveBeenCalledWith(id);
  });

  it('dispatches update', async () => {
    await expect(controller.update(id, { isActive: false })).resolves.toEqual(dto);
    expect(usersService.update).toHaveBeenCalledWith(id, { isActive: false });
  });

  it('dispatches remove', async () => {
    await expect(controller.remove(id)).resolves.toBeUndefined();
    expect(usersService.remove).toHaveBeenCalledWith(id);
  });
});
