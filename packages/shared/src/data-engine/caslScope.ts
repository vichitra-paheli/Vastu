/**
 * CASL query scoping middleware for the generic data engine.
 *
 * Integrates CASL permissions into Prisma where clauses so that every
 * data query automatically respects the user's role-based permissions
 * without requiring manual auth checks in each API route.
 *
 * Implements US-208 AC-1, AC-4, AC-5.
 *
 * Design decision: Domain table names (Race, Driver, etc.) are used as raw
 * string subjects alongside the framework's `Resource` type. CASL's
 * `createMongoAbility` supports arbitrary string subjects, so this works
 * without polluting the `Resource` union type with app-specific models.
 * See plan.md "WARNING — HUMAN DECISION NEEDED" under US-208 (option 3).
 */

import type { AnyMongoAbility, MongoAbility } from '@casl/ability';
import type { AppAbility } from '../permissions/abilities';

/** Internal shape of a CASL rule as we need it for condition extraction. */
interface CaslRule {
  action: string | string[];
  subject: string | string[];
  inverted?: boolean;
  conditions?: Record<string, unknown>;
}

/** Opaque Prisma where object. Re-uses the same alias as filterTranslator. */
export type PrismaWhere = Record<string, unknown>;

// ─── ForbiddenError ───────────────────────────────────────────────────────────

/**
 * Thrown by `scopeQuery` when the user has no read permission for the table.
 * API routes should catch this and return 403.
 */
export class ForbiddenError extends Error {
  readonly statusCode = 403;

  constructor(action: string, table: string) {
    super(`Permission denied: cannot ${action} ${table}`);
    this.name = 'ForbiddenError';
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Merge CASL permission conditions into an existing Prisma `where` clause.
 *
 * Algorithm:
 *  1. Fast-path check — if CASL says the user cannot perform this action on
 *     this subject at all, throw 403 immediately (AC-4).
 *  2. Collect all rules (both positive `can` and inverted `cannot`) matching
 *     `(action, table)`.
 *  3. If no positive rules match → throw `ForbiddenError` (AC-4).
 *  4. If there are NO `cannot` rules and an unconditional `can` rule exists
 *     → return `existingWhere` untouched (admin / blanket-grant sees everything).
 *  5. Positive conditional rules form the allow-list; inverted rules are
 *     translated to `NOT` clauses and ANDed with the allow-list result.
 *  6. If an unconditional `can` rule exists alongside `cannot` rules,
 *     the allow-side is effectively "all rows" and only the `NOT` clauses apply.
 *
 * @param ability - The user's CASL MongoAbility.
 * @param action  - The action being performed (e.g. 'read').
 * @param table   - The Prisma model name (e.g. 'Race').
 * @param existingWhere - The where clause already built from filters/search/tenant.
 * @returns The merged where clause with CASL conditions injected.
 * @throws {ForbiddenError} When the user cannot perform `action` on `table`.
 */
export function scopeQuery(
  ability: AppAbility | AnyMongoAbility,
  action: string,
  table: string,
  existingWhere: PrismaWhere,
): PrismaWhere {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AnyMongoAbility needs casting to access .can() with string args
  const mono = ability as any as MongoAbility<[string, string]>;

  // Step 1: Fast-path check — if CASL says the user cannot perform this
  // action on this subject at all, throw 403 immediately (AC-4).
  // `ability.can()` respects inverted (cannot) rules correctly.
  if (!mono.can(action, table)) {
    throw new ForbiddenError(action, table);
  }

  // Step 2: Collect all rules (both positive and inverted) matching (action, table).
  const positiveRules = getMatchingRules(mono, action, table, false);
  const invertedRules = getMatchingRules(mono, action, table, true);

  // Step 3: No positive rules → deny.
  if (positiveRules.length === 0) {
    throw new ForbiddenError(action, table);
  }

  // Step 4: Admin shortcut — unconditional grant with no cannot rules at all.
  const hasUnconditionalGrant = positiveRules.some((r: CaslRule) => !r.conditions);
  if (hasUnconditionalGrant && invertedRules.length === 0) {
    return existingWhere;
  }

  // Step 5: Build the allow-side clause from positive rules.
  // An unconditional positive rule means "all rows allowed" on the allow-side.
  let allowWhere: PrismaWhere | null;
  if (hasUnconditionalGrant) {
    // Unconditional grant — allow-side is unconstrained; only cannot rules restrict.
    allowWhere = null;
  } else {
    // All positive rules have conditions — OR them together.
    const conditionClauses = positiveRules.map(
      (r: CaslRule) => (r.conditions ?? {}) as PrismaWhere,
    );
    allowWhere =
      conditionClauses.length === 1 ? conditionClauses[0] : { OR: conditionClauses };
  }

  // Step 6: Build NOT clauses from inverted rules that have conditions.
  // Inverted rules without conditions are a full unconditional deny — but CASL's
  // `ability.can()` check above would have already returned false for those,
  // so we never reach here when a full deny exists.
  const notClauses: PrismaWhere[] = invertedRules
    .filter((r: CaslRule) => r.conditions)
    .map((r: CaslRule) => ({ NOT: r.conditions as PrismaWhere }));

  // Step 7: Combine allow-side, not-clauses and existing where.
  const parts: PrismaWhere[] = [];
  if (allowWhere !== null) parts.push(allowWhere);
  parts.push(...notClauses);

  let caslWhere: PrismaWhere;
  if (parts.length === 0) {
    // No additional scoping needed (shouldn't normally reach here).
    return existingWhere;
  } else if (parts.length === 1) {
    caslWhere = parts[0];
  } else {
    caslWhere = { AND: parts };
  }

  return mergeWhere(existingWhere, caslWhere);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collect all CASL rules matching `(action, table)`, filtered by whether they
 * are inverted (`cannot`) or positive (`can`).
 *
 * We walk `ability.rules` manually because CASL's high-level API
 * (`can()`) only returns boolean — we need the condition objects.
 *
 * Rules are matched when:
 *   - `inverted` flag matches the requested `wantInverted` parameter
 *   - action === rule.action OR rule.action === 'manage'
 *   - subject === rule.subject OR rule.subject === 'all'
 *
 * @param ability       - The CASL ability instance.
 * @param action        - The action being performed (e.g. 'read').
 * @param table         - The Prisma model name (e.g. 'Race').
 * @param wantInverted  - When `true`, return only `cannot` rules; when `false`,
 *                        return only positive `can` rules.
 */
function getMatchingRules(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AnyMongoAbility needs any for .rules access
  ability: any,
  action: string,
  table: string,
  wantInverted: boolean,
): CaslRule[] {
  // Cast to unknown first to safely convert the opaque CASL rule type to our
  // internal CaslRule interface. The structure is guaranteed by @casl/ability.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- CASL rules type is opaque; internal structure is stable
  const rules = ability.rules as unknown as CaslRule[];

  return rules.filter((rule: CaslRule) => {
    // Filter by inverted flag.
    const isInverted = rule.inverted === true;
    if (isInverted !== wantInverted) return false;

    // Match action: exact match or 'manage' wildcard.
    const actionMatches =
      rule.action === action ||
      rule.action === 'manage' ||
      (Array.isArray(rule.action) &&
        (rule.action.includes(action) || rule.action.includes('manage')));

    if (!actionMatches) return false;

    // Match subject: exact match or 'all' wildcard.
    const subjectMatches =
      rule.subject === table ||
      rule.subject === 'all' ||
      (Array.isArray(rule.subject) &&
        (rule.subject.includes(table) || rule.subject.includes('all')));

    return subjectMatches;
  });
}

/**
 * Merge the existing where clause with a CASL condition where clause.
 *
 * If existingWhere is empty → return caslWhere directly.
 * Otherwise → `{ AND: [existingWhere, caslWhere] }`.
 */
function mergeWhere(
  existingWhere: PrismaWhere,
  caslWhere: PrismaWhere,
): PrismaWhere {
  if (Object.keys(existingWhere).length === 0) return caslWhere;
  return { AND: [existingWhere, caslWhere] };
}
