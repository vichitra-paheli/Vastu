import { type Prisma, PrismaClient, TenantStatus } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic UUIDs for idempotent upserts
// ---------------------------------------------------------------------------

const IDS = {
  org: 'aaaaaaaa-0000-4000-a000-000000000001',
  tenant: 'bbbbbbbb-0000-4000-a000-000000000001',
  users: {
    admin: 'cccccccc-0000-4000-a000-000000000001',
    editor: 'cccccccc-0000-4000-a000-000000000002',
    viewer: 'cccccccc-0000-4000-a000-000000000003',
  },
  roles: {
    admin: 'dddddddd-0000-4000-a000-000000000001',
    builder: 'dddddddd-0000-4000-a000-000000000002',
    editor: 'dddddddd-0000-4000-a000-000000000003',
    viewer: 'dddddddd-0000-4000-a000-000000000004',
  },
  userRoles: {
    adminAdmin: 'eeeeeeee-0000-4000-a000-000000000001',
    editorEditor: 'eeeeeeee-0000-4000-a000-000000000002',
    viewerViewer: 'eeeeeeee-0000-4000-a000-000000000003',
  },
  dbConnections: {
    production: 'ffffffff-0000-4000-a000-000000000001',
    analytics: 'ffffffff-0000-4000-a000-000000000002',
  },
  apiKeys: {
    cicd: '11111111-0000-4000-a000-000000000001',
    readOnly: '11111111-0000-4000-a000-000000000002',
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

// ---------------------------------------------------------------------------
// Seed: Organization
// ---------------------------------------------------------------------------

async function seedOrganization(): Promise<void> {
  console.log('Seeding organizations...');
  await prisma.organization.upsert({
    where: { id: IDS.org },
    update: {},
    create: {
      id: IDS.org,
      name: 'Acme Corp',
    },
  });
  console.log('  done');
}

// ---------------------------------------------------------------------------
// Seed: Tenant
// ---------------------------------------------------------------------------

async function seedTenant(): Promise<void> {
  console.log('Seeding tenants...');
  await prisma.tenant.upsert({
    where: { id: IDS.tenant },
    update: {},
    create: {
      id: IDS.tenant,
      name: 'Default',
      subdomain: 'default',
      status: TenantStatus.ACTIVE,
      organizationId: IDS.org,
    },
  });
  console.log('  done');
}

// ---------------------------------------------------------------------------
// Seed: Users
// ---------------------------------------------------------------------------

async function seedUsers(): Promise<void> {
  console.log('Seeding users...');

  const users = [
    {
      id: IDS.users.admin,
      email: 'admin@vastu.dev',
      name: 'Admin User',
      emailVerified: true,
    },
    {
      id: IDS.users.editor,
      email: 'editor@vastu.dev',
      name: 'Editor User',
      emailVerified: true,
    },
    {
      id: IDS.users.viewer,
      email: 'viewer@vastu.dev',
      name: 'Viewer User',
      emailVerified: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        ...user,
        organizationId: IDS.org,
      },
    });
  }

  console.log('  done');
}

// ---------------------------------------------------------------------------
// Seed: Roles
// ---------------------------------------------------------------------------

async function seedRoles(): Promise<void> {
  console.log('Seeding roles...');

  const roles = [
    {
      id: IDS.roles.admin,
      name: 'Admin',
      description: 'Full administrative access to all resources',
      isSystem: true,
    },
    {
      id: IDS.roles.builder,
      name: 'Builder',
      description: 'Can read all resources and configure pages',
      isSystem: true,
    },
    {
      id: IDS.roles.editor,
      name: 'Editor',
      description: 'Can read all resources and update records',
      isSystem: true,
    },
    {
      id: IDS.roles.viewer,
      name: 'Viewer',
      description: 'Read-only access to all resources',
      isSystem: true,
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: {
        ...role,
        organizationId: IDS.org,
      },
    });
  }

  console.log('  done');
}

// ---------------------------------------------------------------------------
// Seed: User-Role assignments
// ---------------------------------------------------------------------------

async function seedUserRoles(): Promise<void> {
  console.log('Seeding user-role assignments...');

  const assignments = [
    {
      id: IDS.userRoles.adminAdmin,
      userId: IDS.users.admin,
      roleId: IDS.roles.admin,
      tenantId: IDS.tenant,
    },
    {
      id: IDS.userRoles.editorEditor,
      userId: IDS.users.editor,
      roleId: IDS.roles.editor,
      tenantId: IDS.tenant,
    },
    {
      id: IDS.userRoles.viewerViewer,
      userId: IDS.users.viewer,
      roleId: IDS.roles.viewer,
      tenantId: IDS.tenant,
    },
  ];

  for (const assignment of assignments) {
    await prisma.userRole.upsert({
      where: { id: assignment.id },
      update: {},
      create: assignment,
    });
  }

  console.log('  done');
}

// ---------------------------------------------------------------------------
// Seed: Permissions
// ---------------------------------------------------------------------------

const RESOURCES = [
  'User',
  'Role',
  'Permission',
  'Tenant',
  'Organization',
  'ApiKey',
  'DbConnection',
  'AuditEvent',
  'Page',
  'Record',
] as const;

type Resource = (typeof RESOURCES)[number];

type Action = 'create' | 'read' | 'update' | 'delete' | 'export' | 'manage';

// Build a deterministic ID for each permission from the role + resource + action
function permissionId(roleKey: string, resource: Resource, action: Action): string {
  const input = `${roleKey}:${resource}:${action}`;
  // Use first 8+4+4+4+12 chars of the sha256 to form a UUID-shaped string
  const hash = createHash('sha256').update(input).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    // force version 4 marker
    `4${hash.slice(13, 16)}`,
    // force variant marker
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

type PermissionSpec = {
  roleId: string;
  roleKey: string;
  actions: Action[];
};

async function seedPermissions(): Promise<void> {
  console.log('Seeding permissions...');

  const specs: PermissionSpec[] = [
    // Admin: manage all (full CRUD + manage on every resource)
    {
      roleId: IDS.roles.admin,
      roleKey: 'admin',
      actions: ['create', 'read', 'update', 'delete', 'export', 'manage'],
    },
    // Builder: read all, configure pages (no delete, no manage)
    {
      roleId: IDS.roles.builder,
      roleKey: 'builder',
      actions: ['read', 'export'],
    },
    // Editor: read all, update records
    {
      roleId: IDS.roles.editor,
      roleKey: 'editor',
      actions: ['read', 'update', 'export'],
    },
    // Viewer: read only
    {
      roleId: IDS.roles.viewer,
      roleKey: 'viewer',
      actions: ['read'],
    },
  ];

  for (const spec of specs) {
    for (const resource of RESOURCES) {
      for (const action of spec.actions) {
        const id = permissionId(spec.roleKey, resource, action);
        await prisma.permission.upsert({
          where: { roleId_resource_action: { roleId: spec.roleId, resource, action } },
          update: {},
          create: {
            id,
            roleId: spec.roleId,
            resource,
            action,
            granted: true,
          },
        });
      }
    }
  }

  console.log('  done');
}

// ---------------------------------------------------------------------------
// Seed: DB Connections
// ---------------------------------------------------------------------------

async function seedDbConnections(): Promise<void> {
  console.log('Seeding DB connections...');

  const connections = [
    {
      id: IDS.dbConnections.production,
      name: 'Production Database',
      host: 'db.example.com',
      port: 5432,
      database: 'prod_db',
      username: 'prod_user',
      encryptedPassword: 'PLACEHOLDER_ENCRYPTED_PASSWORD_PROD',
      protocol: 'postgresql',
      healthStatus: 'live',
      lastHealthCheck: hoursAgo(1),
    },
    {
      id: IDS.dbConnections.analytics,
      name: 'Analytics Warehouse',
      host: 'warehouse.example.com',
      port: 5432,
      database: 'analytics',
      username: 'analytics_user',
      encryptedPassword: 'PLACEHOLDER_ENCRYPTED_PASSWORD_ANALYTICS',
      protocol: 'postgresql',
      healthStatus: 'idle',
      lastHealthCheck: hoursAgo(3),
    },
  ];

  for (const conn of connections) {
    await prisma.dbConnection.upsert({
      where: { id: conn.id },
      update: {},
      create: {
        ...conn,
        organizationId: IDS.org,
      },
    });
  }

  console.log('  done');
}

// ---------------------------------------------------------------------------
// Seed: API Keys
// ---------------------------------------------------------------------------

async function seedApiKeys(): Promise<void> {
  console.log('Seeding API keys...');

  const keys = [
    {
      id: IDS.apiKeys.cicd,
      name: 'CI/CD Pipeline Key',
      scope: 'full',
      keyPrefix: 'sk_live_ci',
      keyHash: sha256('sk_live_ci_dummy_seed_key_cicd_pipeline_001'),
      description: 'Used by the CI/CD pipeline for automated deployments',
    },
    {
      id: IDS.apiKeys.readOnly,
      name: 'Read-only Dashboard Key',
      scope: 'read_only',
      keyPrefix: 'sk_live_ro',
      keyHash: sha256('sk_live_ro_dummy_seed_key_readonly_dashboard_001'),
      description: 'Read-only key for the external dashboard integration',
    },
  ];

  for (const key of keys) {
    await prisma.apiKey.upsert({
      where: { id: key.id },
      update: {},
      create: {
        ...key,
        userId: IDS.users.admin,
        organizationId: IDS.org,
      },
    });
  }

  console.log('  done');
}

// ---------------------------------------------------------------------------
// Seed: Audit Events
// ---------------------------------------------------------------------------

async function seedAuditEvents(): Promise<void> {
  console.log('Seeding audit events...');

  type AuditEventSeed = {
    id: string;
    userId: string;
    userName: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceDescription: string;
    payload?: Record<string, unknown>;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    ipAddress: string;
    userAgent: string;
    tenantId: string;
    createdAt: Date;
  };

  const events: AuditEventSeed[] = [
    {
      id: '22222222-0000-4000-a000-000000000001',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'user.login',
      resourceType: 'User',
      resourceId: IDS.users.admin,
      resourceDescription: 'admin@vastu.dev logged in',
      payload: { method: 'email_password' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(1),
    },
    {
      id: '22222222-0000-4000-a000-000000000002',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'user.create',
      resourceType: 'User',
      resourceId: IDS.users.editor,
      resourceDescription: 'Created user editor@vastu.dev',
      payload: { email: 'editor@vastu.dev', role: 'Editor' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(28),
    },
    {
      id: '22222222-0000-4000-a000-000000000003',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'user.create',
      resourceType: 'User',
      resourceId: IDS.users.viewer,
      resourceDescription: 'Created user viewer@vastu.dev',
      payload: { email: 'viewer@vastu.dev', role: 'Viewer' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(27),
    },
    {
      id: '22222222-0000-4000-a000-000000000004',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'role.update',
      resourceType: 'Role',
      resourceId: IDS.roles.editor,
      resourceDescription: 'Updated Editor role description',
      beforeState: { description: null },
      afterState: { description: 'Can read all resources and update records' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(25),
    },
    {
      id: '22222222-0000-4000-a000-000000000005',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'api_key.create',
      resourceType: 'ApiKey',
      resourceId: IDS.apiKeys.cicd,
      resourceDescription: 'Created API key: CI/CD Pipeline Key',
      payload: { scope: 'full', keyPrefix: 'sk_live_ci' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(22),
    },
    {
      id: '22222222-0000-4000-a000-000000000006',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'api_key.create',
      resourceType: 'ApiKey',
      resourceId: IDS.apiKeys.readOnly,
      resourceDescription: 'Created API key: Read-only Dashboard Key',
      payload: { scope: 'read_only', keyPrefix: 'sk_live_ro' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(20),
    },
    {
      id: '22222222-0000-4000-a000-000000000007',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'db_connection.test',
      resourceType: 'DbConnection',
      resourceId: IDS.dbConnections.production,
      resourceDescription: 'Tested connection: Production Database',
      payload: { result: 'success', latencyMs: 42 },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(18),
    },
    {
      id: '22222222-0000-4000-a000-000000000008',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'db_connection.test',
      resourceType: 'DbConnection',
      resourceId: IDS.dbConnections.analytics,
      resourceDescription: 'Tested connection: Analytics Warehouse',
      payload: { result: 'success', latencyMs: 87 },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(18),
    },
    {
      id: '22222222-0000-4000-a000-000000000009',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'organization.update',
      resourceType: 'Organization',
      resourceId: IDS.org,
      resourceDescription: 'Updated organization settings for Acme Corp',
      beforeState: { defaultTimezone: 'UTC', defaultLanguage: 'en' },
      afterState: { defaultTimezone: 'America/New_York', defaultLanguage: 'en' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(15),
    },
    {
      id: '22222222-0000-4000-a000-000000000010',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'tenant.create',
      resourceType: 'Tenant',
      resourceId: IDS.tenant,
      resourceDescription: 'Created tenant: Default',
      payload: { name: 'Default', subdomain: 'default', status: 'ACTIVE' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(30),
    },
    {
      id: '22222222-0000-4000-a000-000000000011',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'permission.update',
      resourceType: 'Permission',
      resourceId: IDS.roles.builder,
      resourceDescription: 'Updated permissions for Builder role',
      beforeState: { actions: ['read'] },
      afterState: { actions: ['read', 'export'] },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(12),
    },
    {
      id: '22222222-0000-4000-a000-000000000012',
      userId: IDS.users.editor,
      userName: 'Editor User',
      action: 'user.login',
      resourceType: 'User',
      resourceId: IDS.users.editor,
      resourceDescription: 'editor@vastu.dev logged in',
      payload: { method: 'email_password' },
      ipAddress: '10.0.0.25',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(10),
    },
    {
      id: '22222222-0000-4000-a000-000000000013',
      userId: IDS.users.viewer,
      userName: 'Viewer User',
      action: 'user.login',
      resourceType: 'User',
      resourceId: IDS.users.viewer,
      resourceDescription: 'viewer@vastu.dev logged in',
      payload: { method: 'sso' },
      ipAddress: '172.16.0.5',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(8),
    },
    {
      id: '22222222-0000-4000-a000-000000000014',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'user.login',
      resourceType: 'User',
      resourceId: IDS.users.admin,
      resourceDescription: 'admin@vastu.dev logged in',
      payload: { method: 'email_password' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(7),
    },
    {
      id: '22222222-0000-4000-a000-000000000015',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'db_connection.create',
      resourceType: 'DbConnection',
      resourceId: IDS.dbConnections.production,
      resourceDescription: 'Created DB connection: Production Database',
      payload: { host: 'db.example.com', port: 5432, protocol: 'postgresql' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(19),
    },
    {
      id: '22222222-0000-4000-a000-000000000016',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'db_connection.create',
      resourceType: 'DbConnection',
      resourceId: IDS.dbConnections.analytics,
      resourceDescription: 'Created DB connection: Analytics Warehouse',
      payload: { host: 'warehouse.example.com', port: 5432, protocol: 'postgresql' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(19),
    },
    {
      id: '22222222-0000-4000-a000-000000000017',
      userId: IDS.users.editor,
      userName: 'Editor User',
      action: 'user.login',
      resourceType: 'User',
      resourceId: IDS.users.editor,
      resourceDescription: 'editor@vastu.dev logged in',
      payload: { method: 'email_password' },
      ipAddress: '10.0.0.25',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(5),
    },
    {
      id: '22222222-0000-4000-a000-000000000018',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'role.update',
      resourceType: 'Role',
      resourceId: IDS.roles.viewer,
      resourceDescription: 'Updated Viewer role description',
      beforeState: { description: null },
      afterState: { description: 'Read-only access to all resources' },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(4),
    },
    {
      id: '22222222-0000-4000-a000-000000000019',
      userId: IDS.users.viewer,
      userName: 'Viewer User',
      action: 'user.login',
      resourceType: 'User',
      resourceId: IDS.users.viewer,
      resourceDescription: 'viewer@vastu.dev logged in',
      payload: { method: 'sso' },
      ipAddress: '172.16.0.5',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: daysAgo(2),
    },
    {
      id: '22222222-0000-4000-a000-000000000020',
      userId: IDS.users.admin,
      userName: 'Admin User',
      action: 'api_key.revoke',
      resourceType: 'ApiKey',
      resourceId: IDS.apiKeys.readOnly,
      resourceDescription: 'Revoked API key: Read-only Dashboard Key',
      beforeState: { deletedAt: null },
      afterState: { deletedAt: new Date().toISOString() },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      tenantId: IDS.tenant,
      createdAt: hoursAgo(6),
    },
  ];

  for (const event of events) {
    await prisma.auditEvent.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        userId: event.userId,
        userName: event.userName,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        resourceDescription: event.resourceDescription,
        payload: event.payload as Prisma.InputJsonValue | undefined,
        beforeState: event.beforeState as Prisma.InputJsonValue | undefined,
        afterState: event.afterState as Prisma.InputJsonValue | undefined,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        tenantId: event.tenantId,
        organizationId: IDS.org,
        createdAt: event.createdAt,
      },
    });
  }

  console.log('  done');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Seeding database...');

  await seedOrganization();
  await seedTenant();
  await seedUsers();
  await seedRoles();
  await seedUserRoles();
  await seedPermissions();
  await seedDbConnections();
  await seedApiKeys();
  await seedAuditEvents();

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
