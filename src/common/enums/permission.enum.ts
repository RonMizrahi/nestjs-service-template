/**
 * Fine-grained permissions declared by endpoints via `@RequirePermissions()`.
 * Endpoints state WHAT they need; which roles grant it is auth-side policy.
 */
export enum Permission {
  UsersRead = 'users:read',
  UsersWrite = 'users:write',
}
