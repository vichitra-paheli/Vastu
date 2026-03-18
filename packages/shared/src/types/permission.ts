export type Permission = {
  id: string;
  roleId: string;
  resource: string;
  action: string;
  granted: boolean;
  conditions: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePermissionInput = Pick<Permission, 'roleId' | 'resource' | 'action'> & {
  granted?: boolean;
  conditions?: Record<string, unknown>;
};

export type UpdatePermissionInput = Partial<Pick<Permission, 'granted' | 'conditions'>>;
