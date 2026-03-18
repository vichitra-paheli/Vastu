export const actions = ['create', 'read', 'update', 'delete', 'export', 'manage', 'configure'] as const;
export type Action = (typeof actions)[number];
