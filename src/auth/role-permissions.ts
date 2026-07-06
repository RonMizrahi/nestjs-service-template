import { Permission } from '../common/enums/permission.enum';
import { Role } from '../common/enums/role.enum';

/**
 * Role → permission policy, applied once at token issuance (the `permissions`
 * claim). Changing who holds a permission is an auth-side change only —
 * endpoints keep declaring the same permissions and never redeploy.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [Role.User]: [],
  [Role.Admin]: [Permission.UsersRead, Permission.UsersWrite],
};

/** Resolves the deduplicated permission set granted by a set of roles. */
export function permissionsForRoles(roles: Role[]): Permission[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]))];
}
