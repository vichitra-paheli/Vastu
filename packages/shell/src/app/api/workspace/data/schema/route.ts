/**
 * GET /api/workspace/data/schema?table=<name>
 *
 * Returns full schema metadata for the given Prisma model name:
 *   - Model name
 *   - Fields: name, type, isRequired, isId, isForeignKey, relatedModel, enumValues
 *   - Relations: name, type (hasOne/hasMany), relatedModel, foreignKey
 *
 * Powered by Prisma DMMF — no database queries required (AC-2).
 * Results are cached in-memory by the introspector (AC-3).
 *
 * Authentication required: builder mode uses this endpoint (AC-4).
 *
 * Implements US-204 AC-1 through AC-4.
 *
 * Query parameters:
 *   table   string   Prisma model name (required)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getModelList, getModelSchema } from '@vastu/shared/data-engine';
import { getSessionWithAbility } from '@/lib/session';

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // 1. Authenticate — builder mode requires a valid session (AC-4)
  const { session } = await getSessionWithAbility();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate the `table` query parameter
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  if (!table) {
    return NextResponse.json(
      { error: '"table" query parameter is required' },
      { status: 400 },
    );
  }

  // 3. Validate model name against DMMF — return 404 for unknown models
  const knownModels = getModelList();
  if (!knownModels.includes(table)) {
    return NextResponse.json(
      {
        error: `Unknown table: "${table}". Valid tables: ${knownModels.join(', ')}`,
      },
      { status: 404 },
    );
  }

  // 4. Return the ModelSchema (served from in-memory cache after first call)
  const schema = getModelSchema(table);
  return NextResponse.json(schema);
}
