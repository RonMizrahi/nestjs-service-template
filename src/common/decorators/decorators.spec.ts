import { Role } from '../enums/role.enum';
import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('metadata decorators', () => {
  it('@Public marks the handler public (happy path)', () => {
    class Dummy {
      @Public()
      handler(this: void): void {}
    }

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Dummy.prototype.handler)).toBe(true);
  });

  it('@Roles records the allowed roles (happy path)', () => {
    class Dummy {
      @Roles(Role.Admin, Role.User)
      handler(this: void): void {}
    }

    expect(Reflect.getMetadata(ROLES_KEY, Dummy.prototype.handler)).toEqual([
      Role.Admin,
      Role.User,
    ]);
  });
});
