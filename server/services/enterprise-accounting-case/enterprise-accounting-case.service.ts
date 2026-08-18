import "server-only";

import { Prisma } from "@prisma/client";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { enterpriseAccountingCaseRepository } from "@server/repositories/enterprise-accounting-case/enterprise-accounting-case.repository";
import type {
  EnterpriseAccountingCaseQuery,
  UpdateEnterpriseAccountingCaseInput,
} from "@/types/enterprise-accounting-case";

function decimal(value: number | null | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isFinite(value)) {
    throw Object.assign(new Error(`${field} must be a finite number`), {
      statusCode: 400,
      code: "INVALID_ACCOUNTING_VALUE",
    });
  }
  return new Prisma.Decimal(value);
}

function date(value: string | null | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`${field} must be a valid date`), {
      statusCode: 400,
      code: "INVALID_ACCOUNTING_VALUE",
    });
  }
  return parsed;
}

function json(value: unknown) {
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

function serialize(row: Record<string, unknown> | null) {
  if (!row) return null;
  const result: Record<string, unknown> = { ...row };
  for (const field of [
    "finalAmount",
    "disbursedAmount",
    "roiPercent",
    "commissionPercent",
    "expectedCommission",
    "confirmedInvoiceAmount",
    "payoutAmount",
    "tdsAmount",
    "shortPaymentAmount",
  ]) {
    const value = result[field] as { toNumber?: () => number } | null | undefined;
    if (value?.toNumber) result[field] = value.toNumber();
  }
  for (const field of ["disbursedDate", "confirmedAt", "createdAt", "updatedAt"]) {
    const value = result[field];
    if (value instanceof Date) result[field] = value.toISOString();
  }
  const deal = result.deal as Record<string, unknown> | null | undefined;
  if (deal && typeof deal === "object") {
    const invoiceParty = deal.invoiceParty as Record<string, unknown> | null | undefined;
    if (invoiceParty && typeof invoiceParty === "object") {
      const rate = invoiceParty.tdsRatePercent as { toNumber?: () => number } | number | null | undefined;
      if (rate && typeof rate === "object" && rate.toNumber) {
        invoiceParty.tdsRatePercent = rate.toNumber();
      }
    }
  }
  return result;
}

export class EnterpriseAccountingCaseService {
  async list(query: EnterpriseAccountingCaseQuery) {
    const organizationId = await resolvePilotOrganizationId();
    const result = await enterpriseAccountingCaseRepository.list(organizationId, query);
    return { ...result, items: result.items.map((row) => serialize(row as unknown as Record<string, unknown>)) };
  }

  async get(caseId: string) {
    const organizationId = await resolvePilotOrganizationId();
    const row = await enterpriseAccountingCaseRepository.findById(organizationId, caseId);
    if (!row) {
      throw Object.assign(new Error("Accounting Case not found"), {
        statusCode: 404,
        code: "ACCOUNTING_CASE_NOT_FOUND",
      });
    }
    return serialize(row as unknown as Record<string, unknown>);
  }

  async update(
    caseId: string,
    input: UpdateEnterpriseAccountingCaseInput,
    actorUserId: string,
  ) {
    if (!Number.isInteger(input.rowVersion) || input.rowVersion < 1) {
      throw Object.assign(new Error("rowVersion must be a positive integer"), {
        statusCode: 400,
        code: "INVALID_ROW_VERSION",
      });
    }
    const data: Prisma.EnterpriseAccountingCaseUpdateManyMutationInput = {};
    if (input.status !== undefined) {
      const status = input.status.trim();
      if (!status) {
        throw Object.assign(new Error("status cannot be empty"), {
          statusCode: 400,
          code: "INVALID_ACCOUNTING_STATUS",
        });
      }
      data.status = status;
    }
    if (input.finalAmount !== undefined) data.finalAmount = decimal(input.finalAmount, "finalAmount");
    if (input.disbursedAmount !== undefined) {
      data.disbursedAmount = decimal(input.disbursedAmount, "disbursedAmount");
    }
    if (input.disbursedDate !== undefined) {
      data.disbursedDate = date(input.disbursedDate, "disbursedDate");
    }
    if (input.roiPercent !== undefined) data.roiPercent = decimal(input.roiPercent, "roiPercent");
    if (input.fees !== undefined) data.feesJson = json(input.fees);
    if (input.commissionPercent !== undefined) {
      data.commissionPercent = decimal(input.commissionPercent, "commissionPercent");
    }
    if (input.expectedCommission !== undefined) {
      data.expectedCommission = decimal(input.expectedCommission, "expectedCommission");
    }
    if (input.confirmedInvoiceAmount !== undefined) {
      data.confirmedInvoiceAmount = decimal(
        input.confirmedInvoiceAmount,
        "confirmedInvoiceAmount",
      );
    }
    if (input.payoutAmount !== undefined) {
      data.payoutAmount = decimal(input.payoutAmount, "payoutAmount");
    }
    if (input.tdsAmount !== undefined) data.tdsAmount = decimal(input.tdsAmount, "tdsAmount");
    if (input.shortPaymentAmount !== undefined) {
      data.shortPaymentAmount = decimal(input.shortPaymentAmount, "shortPaymentAmount");
    }
    if (input.reconciliation !== undefined) {
      data.reconciliationJson = json(input.reconciliation);
    }
    const organizationId = await resolvePilotOrganizationId();
    const row = await enterpriseAccountingCaseRepository.updateOptimistic({
      organizationId,
      caseId,
      rowVersion: input.rowVersion,
      actorUserId,
      data,
    });
    return serialize(row as unknown as Record<string, unknown>);
  }
}

export const enterpriseAccountingCaseService = new EnterpriseAccountingCaseService();
