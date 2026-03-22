/**
 * GET  /api/workspace/pages/[id]/config — fetch page template configuration
 * PUT  /api/workspace/pages/[id]/config — upsert page template configuration
 *
 * TODO: Replace the in-memory store with Prisma once the PageConfiguration
 * migration lands (see PageConfiguration type in @vastu/shared). The API
 * contract (request / response shape) will remain unchanged.
 *
 * Implements VASTU-1B-INFRA.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSessionWithAbility } from '@/lib/session';
import type { PageConfiguration } from '@vastu/shared';

/**
 * In-memory config store.
 * Key: `{organizationId}:{pageId}`
 * Value: PageConfiguration record.
 *
 * This is intentionally process-local and ephemeral — it is replaced by
 * Prisma persistence once the database migration is available.
 */
const configStore = new Map<string, PageConfiguration>();

/**
 * Valid TemplateType values. Duplicated here from @vastu/workspace so that the
 * shell package (server-only) does not take a runtime dependency on the
 * client-only workspace package. Keep in sync with
 * packages/workspace/src/templates/types.ts.
 */
const VALID_TEMPLATE_TYPES = new Set([
  'table-listing',
  'summary-dashboard',
  'multi-tab-detail',
  'data-explorer',
  'form-page',
  'timeline-activity',
  'dashboard',
]);

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Build a stable store key scoped to the organization. */
function storeKey(organizationId: string, pageId: string): string {
  return `${organizationId}:${pageId}`;
}

/**
 * GET /api/workspace/pages/[id]/config
 *
 * Returns the persisted TemplateConfig for the page.
 * Returns 404 when no config is saved yet.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'Page')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: pageId } = await params;
    const key = storeKey(session.user.organizationId, pageId);
    const record = configStore.get(key);

    if (!record) {
      return NextResponse.json(
        { error: 'No configuration found for this page' },
        { status: 404 },
      );
    }

    return NextResponse.json({ config: record.config, version: record.version });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[pages/config GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/workspace/pages/[id]/config
 *
 * Upsert the TemplateConfig for the page.
 * Validates the config shape: templateType is required and must be a known value.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('configure', 'Page')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: pageId } = await params;

    let body: { config?: Record<string, unknown> };
    try {
      body = (await request.json()) as { config?: Record<string, unknown> };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
      return NextResponse.json(
        { error: 'Request body must contain a "config" object' },
        { status: 400 },
      );
    }

    if (typeof body.config.templateType !== 'string' || !body.config.templateType) {
      return NextResponse.json(
        { error: 'config.templateType is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    if (!VALID_TEMPLATE_TYPES.has(body.config.templateType)) {
      return NextResponse.json(
        {
          error: `config.templateType must be one of: ${[...VALID_TEMPLATE_TYPES].join(', ')}`,
        },
        { status: 400 },
      );
    }

    const key = storeKey(session.user.organizationId, pageId);
    const existing = configStore.get(key);
    const now = new Date();

    const record: PageConfiguration = {
      id: existing?.id ?? `${pageId}-config`,
      pageId,
      organizationId: session.user.organizationId,
      config: body.config,
      version: (existing?.version ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    configStore.set(key, record);

    return NextResponse.json({ config: record.config, version: record.version });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[pages/config PUT] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
