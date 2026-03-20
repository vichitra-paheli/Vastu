export type AuditEvent = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  resourceDescription: string | null;
  payload: Record<string, unknown> | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  tenantId: string | null;
  organizationId: string;
  createdAt: Date;
};

export type CreateAuditEventInput = Pick<
  AuditEvent,
  'action' | 'resourceType' | 'organizationId'
> & {
  userId?: string;
  userName?: string;
  resourceId?: string;
  resourceDescription?: string;
  payload?: Record<string, unknown>;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
};
