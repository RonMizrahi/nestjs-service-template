import { Permission } from '../common/enums/permission.enum';
import { Role } from '../common/enums/role.enum';

/** Claims carried by our access tokens. */
export interface JwtPayload {
  /** Subject — the user id. */
  sub: string;
  email: string;
  roles: Role[];
  /** Derived from roles at issuance — see ROLE_PERMISSIONS. */
  permissions: Permission[];
}
