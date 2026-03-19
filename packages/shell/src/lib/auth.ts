/**
 * next-auth v5 configuration for Vastu.
 *
 * Exports `handlers`, `auth`, `signIn`, `signOut` for use throughout the app:
 * - handlers → mounted at /api/auth/[...nextauth]/route.ts
 * - auth     → used in server components and middleware to get the session
 * - signIn / signOut → used in server actions
 *
 * Session strategy: database (via PrismaAdapter).
 * The session callback enriches the session with roles and CASL permission rules
 * so that client components can rebuild AppAbility without an extra round-trip.
 */

// Augment next-auth types — must be imported before NextAuth is called.
import './auth.types';

import NextAuth from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@vastu/shared/prisma';
import { defineAbilitiesFor } from '@vastu/shared/permissions';
import { createAuditEvent } from '@vastu/shared/utils';
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_ISSUER } from './env';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    KeycloakProvider({
      clientId: KEYCLOAK_CLIENT_ID,
      clientSecret: KEYCLOAK_CLIENT_SECRET,
      issuer: KEYCLOAK_ISSUER,
    }),
  ],
  session: {
    strategy: 'database',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  events: {
    async signIn({ user, isNewUser }) {
      // The base next-auth User type has `id?: string`, but PrismaAdapter
      // always populates it. Guard against the undefined case to keep TS happy.
      if (!user.id) {
        console.warn('[auth] signIn event: user.id is undefined — audit event skipped');
        return;
      }

      // Fetch the organizationId from the database — it is not part of the
      // standard next-auth User type but is required for all audit events.
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true, name: true },
      });

      if (!dbUser) {
        // User record not found — skip writing the audit event rather than
        // throwing, because a missing user here should not block sign-in.
        console.warn(`[auth] signIn event: user ${user.id} not found in DB — audit event skipped`);
        return;
      }

      // Fire-and-forget: audit failures must never block authentication.
      createAuditEvent({
        userId: user.id,
        userName: dbUser.name,
        action: 'user.login',
        resourceType: 'User',
        resourceId: user.id,
        resourceDescription: `User signed in: ${user.email ?? user.id}`,
        payload: { isNewUser: isNewUser ?? false },
        organizationId: dbUser.organizationId,
      }).catch((err: unknown) => {
        console.error('[auth] Failed to write login audit event:', err);
      });
    },
  },
  callbacks: {
    async session({ session, user }) {
      // Load user with roles and permissions so CASL works on the client.
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: true,
                },
              },
            },
          },
          organization: true,
        },
      });

      if (dbUser) {
        const roles = dbUser.userRoles.map((ur) => ({
          name: ur.role.name,
          isSystem: ur.role.isSystem,
          permissions: ur.role.permissions.map((p) => ({
            resource: p.resource,
            action: p.action,
            granted: p.granted,
            conditions: p.conditions as Record<string, unknown> | null,
          })),
        }));

        session.user.id = dbUser.id;
        session.user.roles = roles;
        session.user.organizationId = dbUser.organizationId;

        // Use the first UserRole that has a tenantId as the active tenant.
        const userRoleWithTenant = dbUser.userRoles.find((ur) => ur.tenantId);
        session.user.tenantId = userRoleWithTenant?.tenantId ?? null;

        // Serialise CASL rules so the client can reconstruct AppAbility.
        const ability = defineAbilitiesFor({ roles });
        session.user.permissions = ability.rules;
      }

      return session;
    },
  },
});
