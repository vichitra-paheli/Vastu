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
// Keycloak env vars are read directly from process.env so that `next build`
// can collect page data without the vars being present in CI.  At runtime the
// values are always set (enforced by Docker / .env).
//
// The provider is only registered when all required Keycloak env vars are set.
// In CI (E2E tests without Keycloak), auth() still works — it just has no
// providers, so req.auth is always null and middleware redirects to /login.
const keycloakConfigured =
  process.env.KEYCLOAK_CLIENT_ID &&
  process.env.KEYCLOAK_CLIENT_SECRET &&
  process.env.KEYCLOAK_URL &&
  process.env.KEYCLOAK_REALM;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Explicitly pass the secret so @auth/core finds it in all runtimes
  // (Node.js server, Edge Runtime middleware). Falls back to AUTH_SECRET
  // or NEXTAUTH_SECRET env vars.
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

        // US-102: MFA enforcement separation.
        // Cast organization to include mfaRequired added by migration 20260318000003.
        // The Prisma type will reflect this field after `prisma generate` is run.
        const org = dbUser.organization as typeof dbUser.organization & { mfaRequired: boolean };
        if (org.mfaRequired && !dbUser.mfaEnabled) {
          session.user.mfaPending = true;
        }
      }

      return session;
    },
  },
});
