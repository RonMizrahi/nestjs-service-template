import { Permission } from '../common/enums/permission.enum';
import { Role } from '../common/enums/role.enum';
import { permissionsForRoles } from './role-permissions';

describe('permissionsForRoles', () => {
  it('grants admins the users permissions (happy path)', () => {
    expect(permissionsForRoles([Role.Admin])).toEqual([
      Permission.UsersRead,
      Permission.UsersWrite,
    ]);
  });

  it('grants plain users no permissions', () => {
    expect(permissionsForRoles([Role.User])).toEqual([]);
  });

  it('unions and dedupes permissions across multiple roles', () => {
    const permissions = permissionsForRoles([Role.User, Role.Admin]);
    expect(permissions).toEqual([Permission.UsersRead, Permission.UsersWrite]);
    expect(new Set(permissions).size).toBe(permissions.length);
  });
});
