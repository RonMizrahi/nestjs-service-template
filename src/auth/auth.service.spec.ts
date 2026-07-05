import { getLoggerToken } from 'nestjs-pino';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  const id = crypto.randomUUID();
  const email = `${crypto.randomUUID()}@example.dev`;
  const user: Partial<User> = {
    id,
    email,
    passwordHash: 'stored-hash',
    roles: [Role.User],
    isActive: true,
  };

  const usersRepository = {
    create: jest.fn(() => Promise.resolve(user)),
    findByEmail: jest.fn(() => Promise.resolve(user)),
  };
  const passwordService = {
    hash: jest.fn(() => Promise.resolve('new-hash')),
    verify: jest.fn(() => Promise.resolve(true)),
  };
  const jwtService = { signAsync: jest.fn(() => Promise.resolve('signed.jwt.token')) };
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: PasswordService, useValue: passwordService },
        { provide: JwtService, useValue: jwtService },
        { provide: getLoggerToken(AuthService.name), useValue: logger },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('registers a user and returns tokens (happy path)', async () => {
    const tokens = await service.register({ email, password: 'plain-password' });

    expect(passwordService.hash).toHaveBeenCalledWith('plain-password');
    expect(usersRepository.create).toHaveBeenCalledWith({ email, passwordHash: 'new-hash' });
    expect(tokens.accessToken).toBe('signed.jwt.token');
  });

  it('validates good credentials into a principal', async () => {
    await expect(service.validateCredentials(email, 'plain-password')).resolves.toEqual({
      userId: id,
      email,
      roles: [Role.User],
    });
  });

  it('returns null for an unknown email without logging the address', async () => {
    usersRepository.findByEmail.mockResolvedValueOnce(null as unknown as Partial<User>);

    await expect(service.validateCredentials(email, 'x')).resolves.toBeNull();
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(email);
  });

  it('returns null for an inactive user', async () => {
    usersRepository.findByEmail.mockResolvedValueOnce({ ...user, isActive: false });
    await expect(service.validateCredentials(email, 'x')).resolves.toBeNull();
  });

  it('returns null for a wrong password', async () => {
    passwordService.verify.mockResolvedValueOnce(false);
    await expect(service.validateCredentials(email, 'wrong')).resolves.toBeNull();
  });

  it('signs the JWT payload with sub/email/roles', async () => {
    await service.issueTokens({ userId: id, email, roles: [Role.Admin] });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: id,
      email,
      roles: [Role.Admin],
    });
  });
});
