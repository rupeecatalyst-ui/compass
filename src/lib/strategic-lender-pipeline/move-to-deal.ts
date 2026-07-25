/**
 * CO-ARCH — LIFE → Move to Deal (transition orchestration only).
 * Validates Opportunity + Execution Queue lenders, creates Enterprise Deal(s),
 * links to originating Opportunity, opens Deal Workspace (Lender Pipeline).
 *
 * Does not change LIFE → Execution Queue selection architecture.
 */

import { getAccessToken } from "@/lib/api-client";
import {
  persistNewDealToEnterpriseRegistry,
  updateDeal,
  attachEnterpriseDealIdentity,
  upsertEnterpriseDealCacheEntry,
} from "@/lib/enterprise-deal";
import { ensureLoanWorkspaceForOpportunityAsync } from "@/lib/strategic-lender-pipeline/ensure-loan-workspace";
import {
  getStrategicShortlist,
  normalizeLenderKey,
  syncShortlistToIdentified,
  type StrategicLenderShortlistItem,
} from "@/lib/strategic-lender-pipeline/sync";
import {
  listPublishedLenderOptionsAsync,
  type PublishedLenderOption,
} from "@/lib/enterprise-lender-registry/published-directory";
import { rememberOpportunityRegistryContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import type { OpportunityLoanContactHint } from "@/lib/opportunity-loan-continuity";
import type { LoanLenderExecution } from "@/types/catalyst-one";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";

export type MoveToDealInput = {
  opportunityId: string;
  contact?: OpportunityLoanContactHint | null;
  customerName?: string;
  customerMobile?: string;
  customerId?: string;
  loanProduct?: string;
  loanAmount?: number;
  relationshipManager?: string;
};

export type MoveToDealResult = {
  fileId: string;
  opportunityId: string;
  primaryDealId: string;
  deals: Array<{ dealId: string; dealNumber: string; lenderId: string; lenderName: string }>;
  dealWorkspaceHref: string;
};

function resolveLenderRegistryId(
  item: StrategicLenderShortlistItem,
  options: PublishedLenderOption[],
): string | null {
  const ref = (item.lenderRef || "").trim();
  const bare = ref.replace(/^lender:/i, "").trim();
  if (bare) {
    const byId = options.find((o) => o.id === bare);
    if (byId) return byId.id;
    const byCode = options.find((o) => o.code.toLowerCase() === bare.toLowerCase());
    if (byCode) return byCode.id;
  }
  const nameKey = normalizeLenderKey(item.lenderName);
  const byName = options.find(
    (o) =>
      normalizeLenderKey(o.displayName) === nameKey ||
      normalizeLenderKey(o.legalName) === nameKey ||
      normalizeLenderKey(o.code) === nameKey,
  );
  return byName?.id ?? null;
}

function assertSessionForMoveToDeal(): void {
  if (!getAccessToken()?.trim()) {
    throw Object.assign(
      new Error(
        "Missing: Session. Reason: not signed in (or token cleared). Action: sign in, reopen LIFE, then Move to Deal.",
      ),
      { status: 401, code: "SESSION_EXPIRED" },
    );
  }
}

/**
 * Move Opportunity Execution Queue → Enterprise Deal(s) → Deal Workspace.
 */
export async function moveOpportunityToDeal(
  input: MoveToDealInput,
): Promise<MoveToDealResult> {
  assertSessionForMoveToDeal();

  if (!input.opportunityId?.trim()) {
    throw new Error(
      "Missing: Opportunity. Reason: no active Opportunity Context. Action: reopen from My Opportunities.",
    );
  }

  const opportunity = await enterpriseOpportunityApiClient.getOpportunity(
    input.opportunityId,
  );
  rememberOpportunityRegistryContext(opportunity);

  const shortlist = getStrategicShortlist(input.opportunityId);
  if (shortlist.length === 0) {
    throw new Error(
      "Missing: Lender selection. Reason: Execution Queue is empty. Action: select at least one lender in Chanakya Recommendations or Manual Selection.",
    );
  }

  const registryOptions = await listPublishedLenderOptionsAsync();
  const resolved = shortlist.map((item) => ({
    item,
    lenderId: resolveLenderRegistryId(item, registryOptions),
  }));

  const unresolved = resolved.filter((r) => !r.lenderId);
  if (unresolved.length === shortlist.length) {
    throw new Error(
      `Missing: Lender Registry link. Reason: selected lender(s) (${unresolved
        .map((u) => u.item.lenderName)
        .join(
          ", ",
        )}) are not published in Enterprise Lender Registry. Action: select lenders from Manual Selection (Registry).`,
    );
  }

  const file = await ensureLoanWorkspaceForOpportunityAsync({
    opportunityId: input.opportunityId,
    contact: input.contact,
    customerName: input.customerName || opportunity.primaryContactName || undefined,
    customerMobile:
      input.customerMobile || opportunity.primaryContactMobile || undefined,
    customerId: input.customerId || opportunity.primaryContactId,
    loanProduct: input.loanProduct || opportunity.productLabel || "Home Loan",
    loanAmount: input.loanAmount ?? opportunity.requestedAmount ?? undefined,
    relationshipManager:
      input.relationshipManager ||
      opportunity.relationshipManagerName ||
      undefined,
  });

  if (!file) {
    throw new Error(
      "Missing: Deal workspace attachment. Reason: could not link Opportunity to a Deal file. Action: retry Move to Deal.",
    );
  }

  // Identity link only — must not trigger LoanFile completion validation.
  let working =
    updateDeal(
      file.id,
      {
        enterpriseOpportunityId: input.opportunityId,
        opportunityNumber: opportunity.opportunityNumber,
      },
      undefined,
      "opportunity_workspace",
    ) ?? file;

  const syncItems = resolved.map(({ item, lenderId }) => ({
    ...item,
    lenderRef: lenderId ? `lender:${lenderId}` : item.lenderRef,
  }));
  const sync = syncShortlistToIdentified(working.id, input.opportunityId, syncItems, "RM", {
    pruneMissing: false,
  });
  if (!sync.ok) {
    throw new Error(
      `Missing: Lender Pipeline sync. Reason: ${sync.message}. Action: retry Move to Deal.`,
    );
  }

  working = loadLoanFiles().find((f) => f.id === working.id) ?? working;
  const deals: MoveToDealResult["deals"] = [];

  for (const { item, lenderId } of resolved) {
    if (!lenderId) continue;

    const lenders = (working.lenders ?? []).map((l) => {
      const matches =
        normalizeLenderKey(l.lenderRef || l.lender) ===
          normalizeLenderKey(item.lenderRef || item.lenderName) ||
        normalizeLenderKey(l.lender) === normalizeLenderKey(item.lenderName) ||
        l.lenderRegistryId === lenderId;
      return {
        ...l,
        lenderRegistryId: matches ? lenderId : l.lenderRegistryId,
      };
    });

    const hasCase = lenders.some((l) => l.lenderRegistryId === lenderId);
    const nextLenders: LoanLenderExecution[] = hasCase
      ? lenders.map((l) => ({
          ...l,
          isPrimary: l.lenderRegistryId === lenderId,
        }))
      : [
          {
            id: `deal-${lenderId}-${Date.now()}`,
            lender: item.lenderName,
            status: "active",
            caseStage: "identified",
            isPrimary: true,
            lenderRegistryId: lenderId,
            lenderRef: `lender:${lenderId}`,
            fromStrategic: true,
            opportunityId: input.opportunityId,
            createdBy: "RM",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            identifiedAt: new Date().toISOString(),
          },
          ...lenders.map((l) => ({ ...l, isPrimary: false })),
        ];

    const patched = updateDeal(
      working.id,
      {
        lenders: nextLenders,
        lender: item.lenderName,
        enterpriseOpportunityId: input.opportunityId,
        opportunityNumber: opportunity.opportunityNumber,
      },
      `Move to Deal · ${item.lenderName}`,
      "opportunity_workspace",
    );
    working = patched ?? working;

    const deal = await persistNewDealToEnterpriseRegistry(working, {
      opportunityId: input.opportunityId,
      lenderId,
    });
    working = attachEnterpriseDealIdentity(working, deal);
    saveLoanFiles(loadLoanFiles().map((f) => (f.id === working.id ? working : f)));
    upsertEnterpriseDealCacheEntry(working);

    deals.push({
      dealId: deal.id,
      dealNumber: deal.dealNumber,
      lenderId,
      lenderName: item.lenderName,
    });
  }

  if (deals.length === 0) {
    throw new Error(
      "Missing: Deal create. Reason: no lenders resolved to Enterprise Lender Registry ids. Action: select lenders from Manual Selection.",
    );
  }

  // Final cache sync so Lender Pipeline mount does not hydrate a lender-less stub.
  working = loadLoanFiles().find((f) => f.id === working.id) ?? working;
  upsertEnterpriseDealCacheEntry(working);

  const primary = deals[0]!;

  try {
    await enterpriseOpportunityApiClient.markConvertedToDeal(input.opportunityId);
  } catch {
    /* conversion mark is best-effort; Deal create already succeeded */
  }

  setActiveOpportunityContext({
    opportunityId: input.opportunityId,
    opportunityReference: opportunity.opportunityNumber,
    contactId: opportunity.primaryContactId,
    customer: opportunity.primaryContactName ?? undefined,
    product: opportunity.productLabel ?? undefined,
    stage: opportunity.requirementStage ?? undefined,
    owner: opportunity.relationshipManagerName ?? undefined,
    fileId: working.id,
    customerName: opportunity.primaryContactName ?? undefined,
    label: opportunity.opportunityNumber,
  });

  const baseHref = buildCanonicalJourneyStageHref("lender_pipeline", {
    fileId: working.id,
    opportunityId: input.opportunityId,
  });
  const sep = baseHref.includes("?") ? "&" : "?";
  const dealWorkspaceHref = `${baseHref}${sep}dealId=${encodeURIComponent(primary.dealId)}&lenderId=${encodeURIComponent(primary.lenderId)}`;

  return {
    fileId: working.id,
    opportunityId: input.opportunityId,
    primaryDealId: primary.dealId,
    deals,
    dealWorkspaceHref,
  };
}
