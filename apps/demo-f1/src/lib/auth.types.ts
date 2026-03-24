/**
 * next-auth type augmentations for demo-f1.
 *
 * Extends the default Session and User types to include:
 * - id: the database user UUID
 * - roles: array of roles with embedded permissions (from our Role + Permission tables)
 * - organizationId: the user's organization
 * - tenantId: the active tenant (nullable — some users are org-level only)
 * - permissions: serialised CASL rules so the client can reconstruct AppAbility
 */

import type { DefaultSession } from 'next-auth';
import type { RawRuleOf, MongoAbility } from '@casl/ability';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      roles: Array<{
        name: string;
        isSystem: boolean;
        permissions: Array<{
          resource: string;
          action: string;
          granted: boolean;
          conditions?: Record<string, unknown> | null;
        }>;
      }>;
      organizationId: string;
      tenantId: string | null;
      permissions: RawRuleOf<MongoAbility>[];
      /**
       * Set to true by the session callback when the user's organization
       * requires MFA but the user has not yet configured it.
       */
      mfaPending?: boolean;
    };
  }
}
