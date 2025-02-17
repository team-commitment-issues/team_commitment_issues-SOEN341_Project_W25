/**
 * Represents the global roles available in the application.
 * @property {string} SUPER_ADMIN - Only one, has access to everything.
 * @property {string} USER - Represents the user role.
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER = 'USER',
}

/**
 * Represents the roles within a team.
 * @property {string} ADMIN - Represents the admin role within a team.
 * @property {string} MEMBER - Represents the member role within a team.
 */
export enum TeamRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}