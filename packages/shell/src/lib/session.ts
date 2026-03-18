/**
 * Session helpers for server components and API routes.
 *
 * Usage:
 *   // Server component — just needs the session
 *   const session = await getSession();
 *
 *   // Server component / API route — needs session + CASL ability
 *   const { session, ability } = await getSessionWithAbility();
 *
 *   // Server action — throws if unauthenticated
 *   const session = await requireSession();
 *
 *   // Server action — throws if unauthenticated, returns ability too
 *   const { session, ability } = await requireSessionWithAbility();
 */

import { createMongoAbility } from '@casl/ability';
import type { RawRuleOf } from '@casl/ability';
import { auth } from './auth';
import type { AppAbility } from '@vastu/shared/permissions';

/**
 * Returns the current session or null if the user is not authenticated.
 * Safe to call in any server context.
 */
export async function getSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

/**
 * Returns the session and a reconstructed CASL AppAbility.
 * Both values are null when the user is not authenticated.
 */
export async function getSessionWithAbility() {
  const session = await getSession();
  if (!session) return { session: null, ability: null };

  // Cast: session permissions are serialised as RawRuleOf<MongoAbility> (generic string types)
  // but we know they were produced by AppAbility's rule set, so the cast is safe.
  const ability = createMongoAbility(
    session.user.permissions as RawRuleOf<AppAbility>[],
  ) as AppAbility;
  return { session, ability };
}

/**
 * Returns the current session or throws an Error('Unauthorized').
 * Use in server actions and route handlers that must reject unauthenticated callers.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Returns the session and CASL ability, or throws an Error('Unauthorized').
 * Use in server actions that need both auth and permission checks.
 */
export async function requireSessionWithAbility() {
  const { session, ability } = await getSessionWithAbility();
  if (!session || !ability) {
    throw new Error('Unauthorized');
  }
  return { session, ability };
}
