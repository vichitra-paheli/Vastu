import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';

export interface CreateAuditEventParams {
  userId?: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceDescription?: string;
  payload?: Record<string, unknown>;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
  organizationId: string;
}

export async function createAuditEvent(params: CreateAuditEventParams) {
  return prisma.auditEvent.create({
    data: {
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceDescription: params.resourceDescription,
      payload: (params.payload as Prisma.InputJsonValue) ?? undefined,
      beforeState: (params.beforeState as Prisma.InputJsonValue) ?? undefined,
      afterState: (params.afterState as Prisma.InputJsonValue) ?? undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      tenantId: params.tenantId,
      organizationId: params.organizationId,
    },
  });
}
