/**
 * next-auth v5 configuration for demo-f1.
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

// The provider is only registered when all required Keycloak env vars are set.
// In CI (E2E tests without Keycloak), auth() still works — it just has no
// providers, so req.auth is always null and middleware redirects to /login.
const keycloakConfigured =
  process.env.KEYCLOAK_CLIENT_ID &&
  process.env.KEYCLOAK_CLIENT_SECRET &&
  process.env.KEYCLOAK_URL &&
  process.env.KEYCLOAK_REALM;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: keycloakConfigured
    ? [
        KeycloakProvider({
          clientId: process.env.KEYCLOAK_CLIENT_ID!,
          clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
          issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
          // Allow linking Keycloak accounts to existing DB users by matching email.
          // Required because seed creates users in the DB before they sign in via SSO.
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],
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
      if (!user.id) {
        console.warn('[auth] signIn event: user.id is undefined — audit event skipped');
        return;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true, name: true },
      });

      if (!dbUser) {
        console.warn(`[auth] signIn event: user ${user.id} not found in DB — audit event skipped`);
        return;
      }

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

        const userRoleWithTenant = dbUser.userRoles.find((ur) => ur.tenantId);
        session.user.tenantId = userRoleWithTenant?.tenantId ?? null;

        const ability = defineAbilitiesFor({ roles });
        session.user.permissions = ability.rules;

        const org = dbUser.organization as typeof dbUser.organization & { mfaRequired: boolean };
        if (org.mfaRequired && !dbUser.mfaEnabled) {
          session.user.mfaPending = true;
        }
      }

      return session;
    },
  },
});
