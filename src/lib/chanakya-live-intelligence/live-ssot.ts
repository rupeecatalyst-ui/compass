/**
 * CO-CHANAKYA-007 — Live Enterprise Intelligence SSOT (read-path only).
 *
 * CHANAKYA operational advice must come from current Enterprise records.
 * Never resurrects deleted / archived / demo / fixture data.
 * Does not mutate production data.
 */

import { isOpportunityPlanningActive } from "@/constants/opportunity-active-uniqueness";
import { isEnterpriseDealRegistryOperational } from "@/constants/enterprise-deal-registry";
import {
  CHANAKYA_RADAR_EXCLUDED_DEAL_STAGES,
  CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES,
  CHANAKYA_RADAR_EXCLUDED_PROBABILITIES,
} from "@/constants/chanakya-radar";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import type { DealDataSource, DealReadResult } from "@/lib/enterprise-deal/deal-data-access";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { LoanFile } from "@/types/catalyst-one";

/** Explicit demo / fixture identity patterns — never cite as live operations. */
const DEMO_OR_FIXTURE_ID =
  /^(demo:|seed-|fixture-|placeholder-|test-|lf-\d{3}$)/i;

const DEMO_OR_FIXTURE_NAME =
  /\b(demo\s+customer|sample\s+customer|fixture|placeholder|test\s+borrower)\b/i;

export type ChanakyaLiveEntityRef = {
  dealId?: string | null;
  opportunityId?: string | null;
  fileId?: string | null;
};

export type LiveDealPortfolio = {
  files: LoanFile[];
  source: DealDataSource | "unavailable";
  /** When false, CHANAKYA must not invent operational advice from this book. */
  isLiveTrusted: boolean;
  reason?: string;
};

export function looksLikeDemoOrFixtureLoanFile(file: LoanFile): boolean {
  const id = (file.id || "").trim();
  const dealId = (file.enterpriseDealId || "").trim();
  const fileNumber = (file.fileNumber || "").trim();
  const name = (file.customerName || "").trim();
  if (DEMO_OR_FIXTURE_ID.test(id) || DEMO_OR_FIXTURE_ID.test(dealId)) return true;
  if (/^demo:/i.test(fileNumber)) return true;
  if (DEMO_OR_FIXTURE_NAME.test(name)) return true;
  return false;
}

function isTerminalLenderBook(file: LoanFile): boolean {
  const lenders = file.lenders ?? [];
  if (lenders.length === 0) return false;

  const isTerminal = (l: (typeof lenders)[number]) => {
    if (l.status === "closed") return true;
    if (l.caseStage && CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES.has(l.caseStage)) return true;
    if (l.probability && CHANAKYA_RADAR_EXCLUDED_PROBABILITIES.has(l.probability)) return true;
    return false;
  };

  const primary = lenders.find((l) => l.isPrimary) ?? lenders[0];
  if (primary && isTerminal(primary)) {
    // Primary Lost / Post-Disbursement Confirmation / Withdrawn → deal is terminal for Radar
    if (
      primary.caseStage === "lost" ||
      primary.caseStage === "post_disbursement_confirmation" ||
      primary.probability === "withdrawn" ||
      primary.probability === "rejected"
    ) {
      return true;
    }
  }

  // All lenders terminal → exclude from Active Deal Radar
  return lenders.every(isTerminal);
}

/**
 * Active operational Deal projection for CHANAKYA / Radar.
 * CO-CHANAKYA-RADAR-003 — excludes Lost · Post-Disbursement Confirmation ·
 * Cancelled · Withdrawn · Archived (Disbursed remains Radar-eligible until PDC).
 * Terminal Deals never appear on Radar or Average Deal Health.
 */
export function isLiveActiveLoanFile(file: LoanFile): boolean {
  if (!file?.id) return false;
  if (file.archived) return false;
  if (file.status === "completed") return false;

  const stage = String(file.stage ?? "").toLowerCase().trim();
  if (stage && CHANAKYA_RADAR_EXCLUDED_DEAL_STAGES.has(stage)) return false;

  const deleted = (file as { isDeleted?: boolean }).isDeleted;
  if (deleted === true) return false;

  const lifecycle = String(
    (file as { lifecycleStatus?: string }).lifecycleStatus ?? "",
  )
    .toLowerCase()
    .trim();
  if (lifecycle && CHANAKYA_RADAR_EXCLUDED_DEAL_STAGES.has(lifecycle)) return false;

  if (looksLikeDemoOrFixtureLoanFile(file)) return false;
  if (isTerminalLenderBook(file)) return false;
  return true;
}

export function filterLiveActiveLoanFiles(files: LoanFile[]): LoanFile[] {
  return files.filter(isLiveActiveLoanFile);
}

/**
 * Trust gate for Deal-backed intelligence.
 * When Enterprise Deal Registry is operational, local_fallback / unhydrated cache
 * must not drive operational advice (suppresses stale localStorage + demo seed).
 */
export function resolveLiveDealPortfolio(result: DealReadResult): LiveDealPortfolio {
  const files = filterLiveActiveLoanFiles(result.files);
  const operational = isEnterpriseDealRegistryOperational();

  if (operational) {
    if (result.source === "enterprise_deal") {
      return { files, source: result.source, isLiveTrusted: true };
    }
    return {
      files: [],
      source: result.source,
      isLiveTrusted: false,
      reason:
        result.source === "local_fallback"
          ? "No live Deal Registry data yet — local or demo fallback is suppressed."
          : "Live Deal book is not hydrated from the Enterprise Deal Registry.",
    };
  }

  if (!isDemoSeedEnabled()) {
    return {
      files,
      source: result.source,
      isLiveTrusted: true,
      reason:
        files.length === 0
          ? "No relevant live Deal information is available."
          : undefined,
    };
  }

  return { files, source: result.source, isLiveTrusted: true };
}

export function scopeLiveDealPortfolioToEntity(
  portfolio: LiveDealPortfolio,
  entity?: ChanakyaLiveEntityRef | null,
): LiveDealPortfolio {
  if (!entity) return portfolio;
  const dealId = entity.dealId?.trim() || "";
  const fileId = entity.fileId?.trim() || "";
  const opportunityId = entity.opportunityId?.trim() || "";
  if (!dealId && !fileId && !opportunityId) return portfolio;

  const files = portfolio.files.filter((f) => {
    if (
      dealId &&
      (f.enterpriseDealId === dealId ||
        f.id === dealId ||
        f.dealNumber === dealId ||
        f.fileNumber === dealId)
    ) {
      return true;
    }
    if (fileId && (f.id === fileId || f.fileNumber === fileId || f.enterpriseDealId === fileId)) {
      return true;
    }
    if (
      opportunityId &&
      (f.enterpriseOpportunityId === opportunityId || f.opportunityNumber === opportunityId)
    ) {
      return true;
    }
    return false;
  });

  return {
    ...portfolio,
    files,
    reason:
      files.length === 0
        ? "No live records match the current workspace entity."
        : portfolio.reason,
  };
}

/** In-memory Opportunity Registry hydrate for CHANAKYA (client session only). */
let opportunityLiveCache: EnterpriseOpportunityApiRecord[] | null = null;
let opportunityLiveHydrated = false;

export function isLiveOpportunityRecord(row: EnterpriseOpportunityApiRecord): boolean {
  if (!row?.id) return false;
  const soft = row as EnterpriseOpportunityApiRecord & {
    isDeleted?: boolean | null;
    archived?: boolean | null;
    closedAt?: string | Date | null;
  };
  if (soft.isDeleted) return false;
  if (soft.archived) return false;
  if (soft.closedAt) return false;
  const label = `${row.primaryContactName ?? ""} ${row.companyName ?? ""} ${row.productLabel ?? ""}`;
  if (DEMO_OR_FIXTURE_NAME.test(label)) return false;
  if (DEMO_OR_FIXTURE_ID.test(row.id)) return false;
  return true;
}

export function filterLiveOpportunities(
  rows: EnterpriseOpportunityApiRecord[],
): EnterpriseOpportunityApiRecord[] {
  return rows.filter(
    (r) =>
      isLiveOpportunityRecord(r) &&
      isOpportunityPlanningActive(
        r as EnterpriseOpportunityApiRecord & {
          isDeleted?: boolean | null;
          archived?: boolean | null;
          closedAt?: string | Date | null;
        },
      ),
  );
}

export function getLiveOpportunitiesSync(): {
  items: EnterpriseOpportunityApiRecord[];
  hydrated: boolean;
} {
  return {
    items: opportunityLiveCache ?? [],
    hydrated: opportunityLiveHydrated,
  };
}

/** Read-only hydrate from Opportunity Registry API. Never mutates records. */
export async function hydrateLiveOpportunities(): Promise<EnterpriseOpportunityApiRecord[]> {
  try {
    const page = await enterpriseOpportunityApiClient.searchOpportunities({ limit: 200 });
    const items = filterLiveOpportunities(page.items ?? []);
    opportunityLiveCache = items;
    opportunityLiveHydrated = true;
    return items;
  } catch {
    opportunityLiveHydrated = true;
    opportunityLiveCache = opportunityLiveCache ?? [];
    return opportunityLiveCache;
  }
}

export function clearChanakyaLiveOpportunityCacheForTests(): void {
  opportunityLiveCache = null;
  opportunityLiveHydrated = false;
}
