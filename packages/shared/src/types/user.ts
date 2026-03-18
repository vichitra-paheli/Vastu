import type { Permission } from './permission';
import type { Role } from './role';

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  language: string;
  timezone: string;
  colorScheme: string;
  accentColor: string;
  density: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type UserWithRoles = User & {
  roles: (Role & { permissions: Permission[] })[];
};

export type CreateUserInput = Pick<User, 'email' | 'name'> & {
  password?: string;
  organizationId: string;
};

export type UpdateUserInput = Partial<
  Pick<User, 'name' | 'avatarUrl' | 'language' | 'timezone' | 'colorScheme' | 'accentColor' | 'density'>
>;
