import type { Permission } from './permission';

export type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  baseRoleId: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleWithPermissions = Role & {
  permissions: Permission[];
};

export type CreateRoleInput = Pick<Role, 'name' | 'organizationId'> & {
  description?: string;
  isSystem?: boolean;
  baseRoleId?: string;
};

export type UpdateRoleInput = Partial<Pick<Role, 'name' | 'description' | 'baseRoleId'>>;
