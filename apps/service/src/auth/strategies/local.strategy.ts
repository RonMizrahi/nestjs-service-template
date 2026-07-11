import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from '../auth.service';

/** Validates email+password on the login route and populates req.user. */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email' });
  }

  /**
   * Checks the submitted credentials.
   * @throws UnauthorizedException when they don't match a user.
   */
  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.auth.validateCredentials(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }
}
