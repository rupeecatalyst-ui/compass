import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";

export class EnterpriseAccountingGstRateRepository {
  async list(organizationId: string, query?: { enabled?: boolean; activeOnly?: boolean }) {
    const where: Prisma.EnterpriseAccountingGstRateWhereInput = {
      organizationId,
      isDeleted: false,
      ...(query?.activeOnly || query?.enabled === true ? { enabled: true } : {}),
      ...(query?.enabled === false ? { enabled: false } : {}),
    };
    return prisma.enterpriseAccountingGstRate.findMany({
      where,
      orderBy: [{ ratePercent: "asc" }, { name: "asc" }],
    });
  }

  async findById(organizationId: string, id: string) {
    return prisma.enterpriseAccountingGstRate.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
  }

  async create(data: Prisma.EnterpriseAccountingGstRateCreateInput) {
    return prisma.enterpriseAccountingGstRate.create({ data });
  }

  async update(
    organizationId: string,
    id: string,
    data: Prisma.EnterpriseAccountingGstRateUpdateInput,
  ) {
    const existing = await this.findById(organizationId, id);
    if (!existing) {
      throw Object.assign(new Error("GST rate not found"), {
        statusCode: 404,
        code: "GST_RATE_NOT_FOUND",
      });
    }
    return prisma.enterpriseAccountingGstRate.update({
      where: { id },
      data,
    });
  }
}

export const enterpriseAccountingGstRateRepository =
  new EnterpriseAccountingGstRateRepository();
