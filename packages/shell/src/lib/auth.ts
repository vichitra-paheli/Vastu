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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
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
