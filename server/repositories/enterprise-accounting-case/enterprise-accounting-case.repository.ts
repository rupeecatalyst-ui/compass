import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import type { EnterpriseAccountingCaseQuery } from "@/types/enterprise-accounting-case";

export class EnterpriseAccountingCaseRepository {
  async list(organizationId: string, query: EnterpriseAccountingCaseQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const where: Prisma.EnterpriseAccountingCaseWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
    };
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.deal = {
        OR: [
          { dealNumber: { contains: q, mode: "insensitive" } },
          { primaryContactName: { contains: q, mode: "insensitive" } },
          { productLabel: { contains: q, mode: "insensitive" } },
          { primaryCounterpartyName: { contains: q, mode: "insensitive" } },
        ],
      };
    }
    const [total, items] = await Promise.all([
      prisma.enterpriseAccountingCase.count({ where }),
      prisma.enterpriseAccountingCase.findMany({
        where,
        include: {
          deal: {
            select: {
              dealNumber: true,
              opportunityId: true,
              primaryContactName: true,
              productLabel: true,
              primaryCounterpartyName: true,
              invoicePartyId: true,
              invoiceParty: {
                select: {
                  id: true,
                  displayName: true,
                  gstin: true,
                  tdsApplicable: true,
                  tdsRatePercent: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async findById(organizationId: string, caseId: string) {
    return prisma.enterpriseAccountingCase.findFirst({
      where: { id: caseId, organizationId },
      include: {
        deal: {
          select: {
            dealNumber: true,
            opportunityId: true,
            primaryContactName: true,
            productLabel: true,
            primaryCounterpartyName: true,
            invoicePartyId: true,
            invoiceParty: {
              select: {
                id: true,
                displayName: true,
                gstin: true,
                tdsApplicable: true,
                tdsRatePercent: true,
              },
            },
          },
        },
      },
    });
  }

  async updateOptimistic(input: {
    organizationId: string;
    caseId: string;
    rowVersion: number;
    actorUserId: string;
    data: Prisma.EnterpriseAccountingCaseUpdateManyMutationInput;
  }) {
    const result = await prisma.enterpriseAccountingCase.updateMany({
      where: {
        id: input.caseId,
        organizationId: input.organizationId,
        rowVersion: input.rowVersion,
      },
      data: {
        ...input.data,
        updatedBy: input.actorUserId,
        rowVersion: { increment: 1 },
      },
    });
    if (result.count === 0) {
      const exists = await prisma.enterpriseAccountingCase.findFirst({
        where: { id: input.caseId, organizationId: input.organizationId },
        select: { id: true },
      });
      throw Object.assign(
        new Error(exists ? "Accounting Case changed; reload and retry" : "Accounting Case not found"),
        {
          statusCode: exists ? 409 : 404,
          code: exists ? "ACCOUNTING_CASE_CONFLICT" : "ACCOUNTING_CASE_NOT_FOUND",
        },
      );
    }
    return this.findById(input.organizationId, input.caseId);
  }
}

export const enterpriseAccountingCaseRepository =
  new EnterpriseAccountingCaseRepository();
