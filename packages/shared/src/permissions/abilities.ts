import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { Action } from './actions';
import type { Resource } from './resources';

export type AppAbility = MongoAbility<[Action, Resource]>;

interface PermissionForAbilities {
  resource: string;
  action: string;
  granted: boolean;
  conditions?: Record<string, unknown> | null;
}

interface RoleForAbilities {
  name: string;
  isSystem: boolean;
  permissions: PermissionForAbilities[];
}

export interface UserForAbilities {
  roles: RoleForAbilities[];
}

export function defineAbilitiesFor(user: UserForAbilities): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const role of user.roles) {
    // System role grants
    switch (role.name.toLowerCase()) {
      case 'admin':
        can('manage', 'all');
        break;
      case 'builder':
        can('read', 'all');
        can('configure', 'Page');
        can('create', 'Page');
        can('update', 'Page');
        can('delete', 'Page');
        break;
      case 'editor':
        can('read', 'all');
        can('create', 'Record');
        can('update', 'Record');
        can('delete', 'Record');
        break;
      case 'viewer':
        can('read', 'all');
        break;
    }

    // Custom role overrides from permissions table
    for (const perm of role.permissions) {
      const action = perm.action as Action;
      const resource = perm.resource as Resource;

      if (perm.granted) {
        if (perm.conditions) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CASL conditions typing is overly strict for dynamic permissions
          can(action, resource, perm.conditions as any);
        } else {
          can(action, resource);
        }
      } else {
        cannot(action, resource);
      }
    }
  }

  return build();
}

export function isAdmin(ability: AppAbility): boolean {
  return ability.can('manage', 'all');
}
