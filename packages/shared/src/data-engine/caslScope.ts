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
 *  1. If the user has unconditional `manage` / `all` or `action` / `all`
 *     → return `existingWhere` untouched (admin sees everything).
 *  2. Collect all matching CASL rules for `(action, table)`.
 *  3. If no rules match at all → throw `ForbiddenError` (AC-4).
 *  4. Collect condition objects from the matching rules (AC-5).
 *  5. Combine: `AND [existingWhere, OR [condition1, condition2, ...]]`
 *     (multiple rules with conditions form an OR — matching any rule grants access).
 *  6. Rules without conditions (unconditional grants) mean the user can read
 *     all rows → return `existingWhere` untouched.
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

  // Step 2: Admin shortcut — if there's an unconditional grant, return unchanged.
  if (isUnconditionallyGranted(mono, action, table)) {
    return existingWhere;
  }

  // Step 3: Collect only positive (non-inverted) rules matching (action, table).
  const matchingRules = getMatchingRules(mono, action, table);

  // Step 4: Separate conditional from unconditional rules.
  const unconditionalRules = matchingRules.filter((r: CaslRule) => !r.conditions);
  const conditionalRules = matchingRules.filter((r: CaslRule) => r.conditions);

  // Any unconditional grant means the user can see all rows — no extra where needed.
  if (unconditionalRules.length > 0) {
    return existingWhere;
  }

  // Step 5: All matching rules are conditional — build an OR of all condition objects.
  const conditionClauses = conditionalRules.map(
    (r: CaslRule) => (r.conditions ?? {}) as PrismaWhere,
  );

  const caslWhere: PrismaWhere =
    conditionClauses.length === 1
      ? conditionClauses[0]
      : { OR: conditionClauses };

  return mergeWhere(existingWhere, caslWhere);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when the ability grants unconditional access without
 * any conditions attached to a matching rule.
 *
 * "Unconditional" means:
 *   - `can('manage', 'all')` — admin
 *   - `can(action, 'all')` — blanket action on all resources (no conditions)
 *   - `can(action, table)` — direct unconditional grant on this table (no conditions)
 *   - `can('manage', table)` — manage on this specific table (no conditions)
 *
 * This is a fast-path check before iterating rules.
 */
function isUnconditionallyGranted(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cast to any to call relevantRuleFor with string args
  ability: any,
  action: string,
  table: string,
): boolean {
  // Use relevantRuleFor to find the best-matching rule for this action+subject.
  // If it exists and has no conditions, it is unconditional.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- dynamic CASL API
  const rule = ability.relevantRuleFor(action, table) as CaslRule | null;
  if (rule && !rule.conditions && !rule.inverted) {
    return true;
  }

  // Also check 'manage' on 'all' explicitly for the admin case.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- dynamic CASL API
  const manageRule = ability.relevantRuleFor('manage', 'all') as CaslRule | null;
  if (manageRule && !manageRule.conditions && !manageRule.inverted) {
    return true;
  }

  return false;
}

/**
 * Collect all CASL rules that positively match `(action, table)`.
 *
 * We walk `ability.rules` manually because CASL's high-level API
 * (`can()`) only returns boolean — we need the condition objects.
 *
 * Rules are matched when:
 *   - Not inverted (`inverted: false | undefined`)
 *   - action === rule.action OR rule.action === 'manage'
 *   - subject === rule.subject OR rule.subject === 'all'
 */
function getMatchingRules(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AnyMongoAbility needs any for .rules access
  ability: any,
  action: string,
  table: string,
): CaslRule[] {
  // Cast to unknown first to safely convert the opaque CASL rule type to our
  // internal CaslRule interface. The structure is guaranteed by @casl/ability.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- CASL rules type is opaque; internal structure is stable
  const rules = ability.rules as unknown as CaslRule[];

  return rules.filter((rule: CaslRule) => {
    // Skip inverted (cannot) rules — they restrict, not grant.
    if (rule.inverted) return false;

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
