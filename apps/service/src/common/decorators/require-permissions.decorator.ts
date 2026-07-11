import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

/** Declares the permissions a route needs (ALL required) — enforced by PermissionsGuard. */
export const RequirePermissions = (...permissions: Permission[]): CustomDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
