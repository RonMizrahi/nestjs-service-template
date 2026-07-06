import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../common/enums/permission.enum';
import { PermissionsGuard } from './permissions.guard';

function contextWith(userPermissions?: Permission[]): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => (userPermissions ? { user: { permissions: userPermissions } } : {}),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn<Permission[] | undefined, unknown[]>() };
  const guard = new PermissionsGuard(reflector as unknown as Reflector);

  beforeEach(() => jest.clearAllMocks());

  it('allows routes without @RequirePermissions metadata (happy path)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWith())).toBe(true);
  });

  it('allows a token holding all required permissions', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.UsersRead, Permission.UsersWrite]);
    expect(guard.canActivate(contextWith([Permission.UsersRead, Permission.UsersWrite]))).toBe(
      true,
    );
  });

  it('denies when one of the required permissions is missing (ALL semantics)', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.UsersRead, Permission.UsersWrite]);
    expect(guard.canActivate(contextWith([Permission.UsersRead]))).toBe(false);
  });

  it('denies when the token carries no permissions claim', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.UsersRead]);
    expect(guard.canActivate(contextWith())).toBe(false);
  });

  it('passes non-HTTP contexts straight through (Kafka consumers)', () => {
    const rpcContext = { getType: () => 'rpc' } as unknown as ExecutionContext;
    expect(guard.canActivate(rpcContext)).toBe(true);
    expect(reflector.getAllAndOverride).not.toHaveBeenCalled();
  });
});
