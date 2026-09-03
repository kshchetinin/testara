import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { InputJsonObject } from "@/generated/prisma/internal/prismaNamespace";

type Db = typeof prisma | Prisma.TransactionClient;

export async function logAudit(
  params: {
    userId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: InputJsonObject;
  },
  db: Db = prisma
) {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ?? undefined,
    },
  });
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
}

export async function listAuditLogs(filters: AuditLogFilters, page = 1, pageSize = 50) {
  const where = {
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { firstName: true, lastName: true, login: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, pageSize };
}

export async function listDistinctAuditActions() {
  const rows = await prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } });
  return rows.map((r) => r.action);
}
