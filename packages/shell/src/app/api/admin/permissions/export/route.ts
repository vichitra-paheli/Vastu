/**
 * GET /api/admin/permissions/export
 *
 * Exports the full permission matrix as a CSV download.
 * Rows: resource × action combinations.
 * Columns: each role (V/E/D/X = granted, empty = denied).
 *
 * Admin-only: returns 403 for non-admin callers.
 *
 * MCP tool equivalent: export_permission_matrix({ format: 'csv' })
 */

import { NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { requireSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';
import { resources } from '@vastu/shared/permissions';
import { actions } from '@vastu/shared/permissions';

// Map action → CSV column letter
const ACTION_LETTER: Record<string, string> = {
  read: 'V',
  update: 'E',
  delete: 'D',
  export: 'X',
  create: 'C',
  manage: 'M',
  configure: 'Cfg',
};

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dbRoles = await prisma.role.findMany({
      where: { organizationId: session.user.organizationId },
      include: { permissions: true },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    // Build a lookup: roleId → resource → action → granted
    const permissionMap = new Map<string, Map<string, Map<string, boolean>>>();
    for (const role of dbRoles) {
      const resourceMap = new Map<string, Map<string, boolean>>();
      for (const perm of role.permissions) {
        if (!resourceMap.has(perm.resource)) {
          resourceMap.set(perm.resource, new Map());
        }
        resourceMap.get(perm.resource)!.set(perm.action, perm.granted);
      }
      permissionMap.set(role.id, resourceMap);
    }

    const resourceList = (resources as readonly string[]).filter((r) => r !== 'all');
    const actionList = (actions as readonly string[]).filter((a) => a !== 'manage');

    // CSV header: Resource, Action, Letter, <role names...>
    const roleHeaders = dbRoles.map((r) => escapeCsv(r.name));
    const headerRow = ['Resource', 'Action', 'Badge', ...roleHeaders].join(',');

    const dataRows: string[] = [];
    for (const resource of resourceList) {
      for (const action of actionList) {
        const letter = ACTION_LETTER[action] ?? action;
        const roleCells = dbRoles.map((role) => {
          const roleMap = permissionMap.get(role.id);
          const granted = roleMap?.get(resource)?.get(action);
          // For system roles: use predefined grants based on role name
          if (role.isSystem) {
            const name = role.name.toLowerCase();
            if (name === 'admin') return 'granted';
            if (name === 'viewer' && action === 'read') return 'granted';
            if (name === 'editor' && (action === 'read' || action === 'create' || action === 'update' || action === 'delete') && resource === 'Record') return 'granted';
            if (name === 'editor' && action === 'read') return 'granted';
            if (name === 'builder' && (action === 'read' || action === 'create' || action === 'update' || action === 'delete' || action === 'configure') && resource === 'Page') return 'granted';
            if (name === 'builder' && action === 'read') return 'granted';
            return granted === true ? 'granted' : 'denied';
          }
          return granted === true ? 'granted' : 'denied';
        });
        dataRows.push([escapeCsv(resource), escapeCsv(action), letter, ...roleCells].join(','));
      }
    }

    const csv = [headerRow, ...dataRows].join('\n');
    const filename = `permission-matrix-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[permissions/export] GET failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
