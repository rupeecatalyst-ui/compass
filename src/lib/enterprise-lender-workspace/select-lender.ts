import {
  placeholderSaveLifeSelection,
  placeholderSelectLifeInstitution,
  placeholderSetLifeDraft,
  type PlaceholderLifeInstitution,
} from "@/components/catalyst-one/opportunity-workspace/providers/workspace-placeholder-provider";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { updateLoanFileInStorage } from "@/lib/loan-files-utils";
import {
  syncShortlistToIdentified,
  upsertStrategicShortlistItem,
} from "@/lib/strategic-lender-pipeline";
import type { ElwLenderProfile, ElwOriginContext } from "@/types/enterprise-lender-workspace";

export interface ElwSelectLenderResult {
  ok: boolean;
  returnTo: string;
  message: string;
}

/**
 * Persist Select Lender into the originating workflow, then caller navigates to returnTo.
 * Never redirects to Dashboard or Lender Master unless that was the true origin.
 * CO-SPRINT-089 — loan/life paths upsert IDENTIFIED without duplicating.
 */
export function applyElwSelectLender(
  profile: ElwLenderProfile,
  origin: ElwOriginContext,
): ElwSelectLenderResult {
  const primary = profile.contacts.find((c) => c.isExecutor) ?? profile.contacts[0];

  if (origin.from === "opportunity_workspace" && origin.opportunityId) {
    const institution: PlaceholderLifeInstitution = {
      lenderRef: profile.lenderRef,
      lenderName: profile.name,
      productRefs: profile.products.map((p) => p.productRef),
      businessMappingRefs: ["mapping:west"],
      cities: profile.cities,
      branchNames: profile.branchNames,
      executorCount: profile.contacts.filter((c) => c.isExecutor).length,
      recommended: true,
      productCompatible: true,
      eligibility: "eligible",
      successProbability: profile.metrics.successProbability,
    };
    placeholderSelectLifeInstitution(origin.opportunityId, institution);
    if (primary) {
      placeholderSetLifeDraft(origin.opportunityId, {
        lenderName: profile.name,
        executorName: primary.name,
        branchName: primary.branchName,
        contactId: primary.contactId,
        lenderRef: profile.lenderRef,
        productRefs: institution.productRefs,
        businessMappingRefs: institution.businessMappingRefs,
        recommended: true,
        successProbability: profile.metrics.successProbability,
        productCompatible: true,
        eligibility: "eligible",
      });
      placeholderSaveLifeSelection(origin.opportunityId);
    }
    upsertStrategicShortlistItem(origin.opportunityId, {
      lenderRef: profile.lenderRef,
      lenderName: profile.name,
      product: profile.products[0]?.label,
      productRefs: institution.productRefs,
      successProbability: profile.metrics.successProbability,
      specialNotes: "Selected from Enterprise Lender Workspace",
      branchName: primary?.branchName ?? profile.branchNames[0],
      executorName: primary?.name,
      createdBy: "RM",
    });
    return {
      ok: true,
      returnTo: origin.returnTo,
      message: `${profile.name} selected — returning to Opportunity Workspace.`,
    };
  }

  if ((origin.from === "loan_files" || origin.from === "life") && origin.loanFileId) {
    const files = loadLoanFiles() ?? getInitialLoanFiles();
    const file = files.find((f) => f.id === origin.loanFileId);
    const existing = file?.lenders?.find(
      (c) => c.lender.toLowerCase() === profile.name.toLowerCase() || c.lenderRef === profile.lenderRef,
    );
    if (existing) {
      return {
        ok: true,
        returnTo: origin.returnTo,
        message: `${profile.name} already on pipeline — opening existing case (no duplicate).`,
      };
    }

    const opportunityId = origin.opportunityId ?? `loan:${origin.loanFileId}`;
    const shortlist = upsertStrategicShortlistItem(opportunityId, {
      lenderRef: profile.lenderRef,
      lenderName: profile.name,
      product: profile.products[0]?.label,
      productRefs: profile.products.map((p) => p.productRef),
      successProbability: profile.metrics.successProbability,
      branchName: primary?.branchName ?? profile.branchNames[0],
      executorName: primary?.name,
      specialNotes: "Selected from Enterprise Lender Workspace",
      createdBy: "RM",
    });
    const sync = syncShortlistToIdentified(origin.loanFileId, opportunityId, shortlist);
    if (!sync.ok) {
      // Fallback single upsert if sync failed to load file
      const now = new Date().toISOString();
      updateLoanFileInStorage(origin.loanFileId, {
        lenders: [
          {
            id: `elw-${profile.lenderId}-${Date.now()}`,
            lender: profile.name,
            lenderRef: profile.lenderRef,
            branch: primary?.branchName ?? profile.branchNames[0] ?? "",
            relationshipManager: primary?.name ?? "",
            status: "active",
            caseStage: "identified",
            isPrimary: !(file?.lenders?.length),
            fromStrategic: true,
            createdAt: now,
            updatedAt: now,
          },
          ...(file?.lenders ?? []),
        ],
        lender: profile.name,
      });
    }
    return {
      ok: true,
      returnTo: origin.returnTo,
      message: sync.message || `${profile.name} linked to Identified.`,
    };
  }

  return {
    ok: true,
    returnTo: origin.returnTo,
    message: `${profile.name} noted — returning to ${origin.from === "unknown" ? "your previous screen" : "origin"}.`,
  };
}
