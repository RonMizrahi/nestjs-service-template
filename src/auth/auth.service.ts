import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersRepository } from '../users/users.repository';
import { AuthTokensDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload.interface';
import { PasswordService } from './password.service';

/** Registration, credential validation, and token issuing. */
@Injectable()
export class AuthService {
  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user and signs them in.
   * @throws DuplicateResourceException when the email is taken.
   */
  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.usersRepository.create({ email: dto.email, passwordHash });
    this.logger.info({ userId: user.id }, 'User registered');
    return this.issueTokens({ userId: user.id, email: user.email, roles: user.roles });
  }

  /**
   * Validates login credentials.
   * @returns The principal, or null when email/password don't match.
   */
  async validateCredentials(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user?.isActive) {
      // no email in the log — it's PII; the request correlationId is enough to trace
      this.logger.warn('Login failed: unknown or inactive user');
      return null;
    }
    const matches = await this.passwordService.verify(user.passwordHash, password);
    if (!matches) {
      this.logger.warn({ userId: user.id }, 'Login failed');
      return null;
    }
    return { userId: user.id, email: user.email, roles: user.roles };
  }

  /** Signs an access token for the authenticated principal. */
  async issueTokens(user: AuthenticatedUser): Promise<AuthTokensDto> {
    const payload: JwtPayload = { sub: user.userId, email: user.email, roles: user.roles };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
