import { prisma } from "@server/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { RegistryAuditQuery } from "@/types/enterprise-master-data";
import { mapPrismaAuditToDomain, type AuditCreateData } from "./mappers";

function toJson(value?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return value as Prisma.InputJsonValue;
}

export class EnterpriseRegistryAuditRepository {
  async append(input: AuditCreateData) {
    const row = await prisma.enterpriseRegistryAuditEntry.create({
      data: {
        organizationId: input.organizationId,
        registryModule: input.registryModule,
        entityId: input.entityId,
        entityCode: input.entityCode,
        action: input.action,
        previousValue: toJson(input.previousValue),
        newValue: toJson(input.newValue),
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        reason: input.reason,
      },
    });
    return mapPrismaAuditToDomain(row);
  }

  async query(organizationId: string, query: RegistryAuditQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 50));

    const where: NonNullable<
      Parameters<typeof prisma.enterpriseRegistryAuditEntry.findMany>[0]
    >["where"] = { organizationId };

    if (query.registryModule) where.registryModule = query.registryModule;
    if (query.entityId) where.entityId = query.entityId;

    const [total, rows] = await prisma.$transaction([
      prisma.enterpriseRegistryAuditEntry.count({ where }),
      prisma.enterpriseRegistryAuditEntry.findMany({
        where,
        orderBy: { at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapPrismaAuditToDomain),
      total,
      page,
      pageSize,
    };
  }
}

export const enterpriseRegistryAuditRepository = new EnterpriseRegistryAuditRepository();
