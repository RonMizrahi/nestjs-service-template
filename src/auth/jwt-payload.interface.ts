import { Role } from '../common/enums/role.enum';

/** Claims carried by our access tokens. */
export interface JwtPayload {
  /** Subject — the user id. */
  sub: string;
  email: string;
  roles: Role[];
}
