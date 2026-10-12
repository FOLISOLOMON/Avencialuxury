import { prisma, ensureDefaultBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export interface LogAuditParams {
  businessId?: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Records an immutable audit log entry.
 * Errors during audit logging are caught and warned so core operations are never broken.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const businessId = params.businessId || DEFAULT_BUSINESS_ID;
    await prisma.auditLog.create({
      data: {
        businessId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details || undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.warn("[Audit] Failed to record audit log entry:", err);
  }
}

/**
 * Retrieves audit log entries for owner review.
 */
export async function getAuditLogs(businessId: string, options?: {
  limit?: number;
  offset?: number;
  action?: string;
  entityType?: string;
}) {
  await ensureDefaultBusiness(businessId);

  const limit = Math.min(100, Math.max(1, options?.limit || 50));
  const offset = Math.max(0, options?.offset || 0);

  const where: any = { businessId };
  if (options?.action) where.action = options.action;
  if (options?.entityType) where.entityType = options.entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
}
