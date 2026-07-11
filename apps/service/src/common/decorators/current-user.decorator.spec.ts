import { ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { AuthenticatedUser, CurrentUser } from './current-user.decorator';

// Nest's internal metadata key for route argument factories (@nestjs/common/constants).
const ROUTE_ARGS_METADATA = '__routeArguments__';

type ParamFactory = (data: unknown, ctx: ExecutionContext) => AuthenticatedUser;

describe('CurrentUser', () => {
  it('extracts req.user from the execution context (happy path)', () => {
    class Dummy {
      handler(@CurrentUser() _user: AuthenticatedUser): void {}
    }

    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Dummy, 'handler') as Record<
      string,
      { factory: ParamFactory }
    >;
    const factory = Object.values(metadata)[0].factory;

    const user: AuthenticatedUser = {
      userId: crypto.randomUUID(),
      email: 'ada@example.dev',
      roles: [Role.User],
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;

    expect(factory(undefined, ctx)).toEqual(user);
  });
});
