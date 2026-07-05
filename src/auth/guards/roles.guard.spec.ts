import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from './roles.guard';

function contextWith(roles: Role[] | undefined, userRoles?: Role[]): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => (userRoles ? { user: { roles: userRoles } } : {}),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn<Role[] | undefined, unknown[]>() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  beforeEach(() => jest.clearAllMocks());

  it('allows routes without @Roles metadata (happy path)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it('allows a user holding a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);
    expect(guard.canActivate(contextWith([Role.Admin], [Role.Admin, Role.User]))).toBe(true);
  });

  it('denies a user missing the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);
    expect(guard.canActivate(contextWith([Role.Admin], [Role.User]))).toBe(false);
  });

  it('denies when no user is on the request', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);
    expect(guard.canActivate(contextWith([Role.Admin]))).toBe(false);
  });
});
