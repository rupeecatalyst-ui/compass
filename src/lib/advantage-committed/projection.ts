import { ADVANTAGE_COMMITTED_CURRENCY, ADVANTAGE_COMMITTED_LABEL } from "@/constants/advantage-committed";
import type { AdvantageCommittedRecord } from "@/types/advantage-committed";
import { resolveAdvantageCommittedDisplay } from "./display";
import { canonicalCommittedRupees } from "./money";

export type AdvantageCommittedSourceRow = {
  id?: string | null;
  organizationId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  advantageCommittedAmount?: unknown;
  advantageCommittedCurrency?: string | null;
  advantageCommittedAt?: string | Date | null;
  advantageCommittedByUserId?: string | null;
  advantageCommittedProductCode?: string | null;
  advantageCommitmentId?: string | null;
  advantageCommitmentVersion?: number | null;
  sourceCode?: string | null;
  sourceCampaignLabel?: string | null;
  marketingCampaignId?: string | null;
  marketingSourceDetail?: string | null;
  marketingProspectRef?: string | null;
};

function iso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const trimmed = String(value).trim();
  return trimmed || null;
}

export function projectAdvantageCommitted(
  row: AdvantageCommittedSourceRow | null | undefined,
): AdvantageCommittedRecord {
  const display = resolveAdvantageCommittedDisplay({
    productCode: row?.productCode,
    productLabel: row?.productLabel,
    committedProductCode: row?.advantageCommittedProductCode,
    amount: row?.advantageCommittedAmount,
  });
  return {
    opportunityId: row?.id ?? "",
    organizationId: row?.organizationId ?? "",
    amount: display.amount,
    currency: display.amount ? ADVANTAGE_COMMITTED_CURRENCY : null,
    status: display.status,
    display: display.display,
    productCode: row?.advantageCommittedProductCode ?? row?.productCode ?? null,
    committedAt: iso(row?.advantageCommittedAt),
    committedByUserId: row?.advantageCommittedByUserId ?? null,
    commitmentId: row?.advantageCommitmentId ?? null,
    commitmentVersion: row?.advantageCommitmentVersion ?? 0,
    marketingCampaignId: row?.marketingCampaignId ?? null,
    marketingCampaignName: row?.sourceCampaignLabel ?? null,
    marketingSource: row?.sourceCode ?? null,
    marketingSourceDetail: row?.marketingSourceDetail ?? null,
    marketingProspectRef: row?.marketingProspectRef ?? null,
  };
}

export function serializeAdvantageCommittedApi(row: AdvantageCommittedSourceRow | null | undefined) {
  const projected = projectAdvantageCommitted(row);
  return {
    advantageCommittedAmount: projected.amount,
    advantageCommittedDisplay: projected.display,
    advantageCommittedStatus: projected.status,
    advantageCommittedLabel: ADVANTAGE_COMMITTED_LABEL,
    advantageCommittedCurrency: projected.currency,
    advantageCommittedAt: projected.committedAt,
    advantageCommittedByUserId: projected.committedByUserId,
    advantageCommittedProductCode: projected.productCode,
    advantageCommitmentId: projected.commitmentId,
    advantageCommitmentVersion: projected.commitmentVersion,
    marketingCampaignId: projected.marketingCampaignId,
    marketingCampaignName: projected.marketingCampaignName,
    marketingSource: projected.marketingSource,
    marketingSourceDetail: projected.marketingSourceDetail,
    marketingProspectRef: projected.marketingProspectRef,
  };
}

export function inheritedDealAdvantageCommitted(opportunity: AdvantageCommittedSourceRow | null | undefined) {
  return serializeAdvantageCommittedApi(opportunity);
}

export function canonicalAmountFromRow(row: AdvantageCommittedSourceRow | null | undefined): string | null {
  return canonicalCommittedRupees(row?.advantageCommittedAmount);
}
