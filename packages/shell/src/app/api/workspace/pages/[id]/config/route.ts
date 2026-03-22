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
import { getSessionWithAbility } from '@/lib/session';
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
 * Returns 404 with a `defaultConfig` hint when no config is saved yet.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { session } = await getSessionWithAbility();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: pageId } = await params;
  const key = storeKey(session.user.organizationId, pageId);
  const record = configStore.get(key);

  if (!record) {
    return NextResponse.json(
      {
        error: 'No configuration found for this page',
        defaultConfig: { templateType: 'table-listing' },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ config: record.config, version: record.version });
}

/**
 * PUT /api/workspace/pages/[id]/config
 *
 * Upsert the TemplateConfig for the page.
 * Validates the config shape: templateType is required.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { session } = await getSessionWithAbility();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: pageId } = await params;

  const body = (await request.json()) as { config?: Record<string, unknown> };

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
}
