import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/** Declares the roles allowed to hit a route — enforced by RolesGuard. */
export const Roles = (...roles: Role[]): CustomDecorator => SetMetadata(ROLES_KEY, roles);
