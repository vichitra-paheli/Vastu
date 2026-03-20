/**
 * Shared types for admin user management components.
 * Defined here (not in the API route) so client components can import
 * them without pulling in server-only modules.
 */

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  roles: { id: string; name: string }[];
}

export interface RoleSelectOption {
  value: string;
  label: string;
}
