import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

/** Enforces @Roles() metadata against the authenticated user's roles. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // roles live on the HTTP principal — RPC/event contexts (Kafka) pass through
    if (context.getType() !== 'http') return true;
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return required.some((role) => user?.roles?.includes(role));
  }
}
