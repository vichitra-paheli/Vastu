export const resources = [
  'User',
  'Role',
  'Permission',
  'Tenant',
  'Organization',
  'ApiKey',
  'DbConnection',
  'AuditEvent',
  'SsoProvider',
  'Page',
  'Record',
  'all',
] as const;

export type Resource = (typeof resources)[number];
