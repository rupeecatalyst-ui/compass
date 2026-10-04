import "server-only";

import { Prisma } from "@prisma/client";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { enterpriseAccountingCaseRepository } from "@server/repositories/enterprise-accounting-case/enterprise-accounting-case.repository";
import type {
  EnterpriseAccountingCaseQuery,
  UpdateEnterpriseAccountingCaseInput,
} from "@/types/enterprise-accounting-case";
import { decideDealCannotIntroduceCommitment } from "@/lib/advantage-committed";
import { loadOpportunityCommitmentByIds } from "@server/services/advantage-committed/advantage-committed.service";

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

async function attachAdvantageCommitted(
  organizationId: string,
  serialized: Record<string, unknown> | null,
) {
  if (!serialized) return serialized;
  const deal = serialized.deal as { opportunityId?: string | null } | null | undefined;
  const opportunityId = deal?.opportunityId?.trim();
  if (!opportunityId) {
    return {
      ...serialized,
      advantageCommittedDisplay: "Not applicable",
      advantageCommittedStatus: "not_applicable",
      advantageCommittedMismatch: false,
    };
  }
  const map = await loadOpportunityCommitmentByIds(organizationId, [opportunityId]);
  const commitment = map.get(opportunityId);
  const snapshot =
    serialized.upstreamSnapshot && typeof serialized.upstreamSnapshot === "object"
      ? (serialized.upstreamSnapshot as Record<string, unknown>)
      : null;
  const snapAmount =
    snapshot && typeof snapshot.advantageCommitted === "object"
      ? (snapshot.advantageCommitted as { advantageCommittedAmount?: string | null })
          .advantageCommittedAmount
      : null;
  const mismatch = Boolean(
    snapAmount &&
      commitment?.advantageCommittedAmount &&
      snapAmount !== commitment.advantageCommittedAmount,
  );
  return {
    ...serialized,
    ...(commitment ?? {}),
    advantageCommittedMismatch: mismatch,
    advantageCommittedMismatchLabel: mismatch
      ? "Advantage Committed (₹) does not match the Opportunity. Handoff blocked until corrected."
      : null,
  };
}

export class EnterpriseAccountingCaseService {
  async list(query: EnterpriseAccountingCaseQuery) {
    const organizationId = await resolvePilotOrganizationId();
    const result = await enterpriseAccountingCaseRepository.list(organizationId, query);
    const opportunityIds = result.items
      .map((row) => (row as { deal?: { opportunityId?: string | null } }).deal?.opportunityId)
      .filter((id): id is string => Boolean(id));
    const map = await loadOpportunityCommitmentByIds(organizationId, opportunityIds);
    return {
      ...result,
      items: result.items.map((row) => {
        const serialized = serialize(row as unknown as Record<string, unknown>) ?? {};
        const opportunityId = (row as { deal?: { opportunityId?: string | null } }).deal
          ?.opportunityId;
        const commitment = opportunityId ? map.get(opportunityId) : undefined;
        const snapshot =
          serialized.upstreamSnapshot && typeof serialized.upstreamSnapshot === "object"
            ? (serialized.upstreamSnapshot as Record<string, unknown>)
            : null;
        const snapAmount =
          snapshot && typeof snapshot.advantageCommitted === "object"
            ? (snapshot.advantageCommitted as { advantageCommittedAmount?: string | null })
                .advantageCommittedAmount
            : null;
        const mismatch = Boolean(
          snapAmount &&
            commitment?.advantageCommittedAmount &&
            snapAmount !== commitment.advantageCommittedAmount,
        );
        return {
          ...serialized,
          ...(commitment ?? {}),
          advantageCommittedMismatch: mismatch,
        };
      }),
    };
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
    return attachAdvantageCommitted(
      organizationId,
      serialize(row as unknown as Record<string, unknown>),
    );
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
    const introduced = decideDealCannotIntroduceCommitment({
      opportunityAmount: null,
      incomingDealAmount: (input as Record<string, unknown>).advantageCommittedAmount,
    });
    if (!introduced.ok) {
      throw Object.assign(new Error(introduced.message), {
        statusCode: 403,
        code: "ADVANTAGE_COMMITTED_IMMUTABLE",
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

    // CO-ACCOUNTING-INVOICE-OPERATIONS-015 — validate commercial capture when loan amounts + payout % provided
    const finalCandidate =
      input.finalAmount !== undefined
        ? input.finalAmount
        : undefined;
    const disbursedCandidate =
      input.disbursedAmount !== undefined ? input.disbursedAmount : undefined;
    const payoutPctCandidate =
      input.commissionPercent !== undefined ? input.commissionPercent : undefined;
    if (
      finalCandidate != null &&
      disbursedCandidate != null &&
      payoutPctCandidate != null
    ) {
      const { calculateAccountingCommercialCapture } = await import(
        "@/lib/enterprise-accounting-invoice/commercial"
      );
      const commercial = calculateAccountingCommercialCapture({
        finalLoanAmount: finalCandidate,
        amountDisbursed: disbursedCandidate,
        payoutPercent: payoutPctCandidate,
      });
      data.finalAmount = decimal(commercial.finalLoanAmount, "finalAmount");
      data.disbursedAmount = decimal(commercial.amountDisbursed, "disbursedAmount");
      data.commissionPercent = decimal(commercial.payoutPercent, "commissionPercent");
      data.expectedCommission = decimal(commercial.payoutCommission, "expectedCommission");
      data.payoutAmount = decimal(commercial.payoutCommission, "payoutAmount");
      data.confirmedInvoiceAmount = decimal(commercial.taxableValue, "confirmedInvoiceAmount");
      data.reconciliationJson = json({
        ...(typeof input.reconciliation === "object" && input.reconciliation
          ? input.reconciliation
          : {}),
        pendingLoanAmount: commercial.pendingLoanAmount,
        payoutBasis: commercial.payoutBasis,
        payoutBasisLabel: commercial.payoutBasisLabel,
        commercialCaptureVersion: "CO-ACCOUNTING-INVOICE-OPERATIONS-015",
      });
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
