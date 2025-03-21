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

/**
 * Represents the status types available in the application.
 * @property {string} ONLINE - Represents the online status.
 * @property {string} AWAY - Represents the away status.
 * @property {string} BUSY - Represents the busy status.
 * @property {string} OFFLINE - Represents the offline status.
*/
export enum StatusType {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}