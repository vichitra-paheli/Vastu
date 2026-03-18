/**
 * Admin components barrel export.
 * Import from '@/components/admin' for clean import paths.
 */

export { TenantCard, type TenantCardData, type TenantCardProps } from './TenantCard';
export { TenantList, type TenantListProps } from './TenantList';
export { CreateTenantModal, type CreateTenantModalProps } from './CreateTenantModal';

export { AuditLogTable } from './AuditLogTable';
export type { AuditLogTableProps } from './AuditLogTable';

export { AuditLogRow } from './AuditLogRow';
export type { AuditLogRowProps } from './AuditLogRow';

export { AuditDetailDrawer } from './AuditDetailDrawer';
export type { AuditDetailDrawerProps } from './AuditDetailDrawer';

export type { UserListItem, RoleSelectOption } from './types';

export { UserList } from './UserList';
export type { UserListProps } from './UserList';

export { UserRow } from './UserRow';
export type { UserRowProps } from './UserRow';

export { InviteUserModal } from './InviteUserModal';
export type { InviteUserModalProps } from './InviteUserModal';

export { EditUserDrawer } from './EditUserDrawer';
export type { EditUserDrawerProps } from './EditUserDrawer';

export { RoleCard } from './RoleCard';
export type { RoleCardProps, RoleCardRole } from './RoleCard';

export { RoleList } from './RoleList';
export type { RoleListProps, RoleListRole } from './RoleList';

export { CreateRoleModal } from './CreateRoleModal';
export type { CreateRoleModalProps, CreatedRole } from './CreateRoleModal';

export { EditRoleDrawer } from './EditRoleDrawer';
export type { EditRoleDrawerProps, EditRoleRole, EditRolePermission } from './EditRoleDrawer';
