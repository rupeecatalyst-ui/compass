import {
  placeholderSaveLifeSelection,
  placeholderSelectLifeInstitution,
  placeholderSetLifeDraft,
  type PlaceholderLifeInstitution,
} from "@/components/catalyst-one/opportunity-workspace/providers/workspace-placeholder-provider";
import { updateLoanFileInStorage } from "@/lib/loan-files-utils";
import type { ElwLenderProfile, ElwOriginContext } from "@/types/enterprise-lender-workspace";
import type { LoanLenderExecution } from "@/types/catalyst-one";

export interface ElwSelectLenderResult {
  ok: boolean;
  returnTo: string;
  message: string;
}

/**
 * Persist Select Lender into the originating workflow, then caller navigates to returnTo.
 * Never redirects to Dashboard or Lender Master unless that was the true origin.
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
    return {
      ok: true,
      returnTo: origin.returnTo,
      message: `${profile.name} selected — returning to Opportunity Workspace.`,
    };
  }

  if ((origin.from === "loan_files" || origin.from === "life") && origin.loanFileId) {
    const now = new Date().toISOString();
    const lenderCase: LoanLenderExecution = {
      id: `elw-${profile.lenderId}-${Date.now()}`,
      lender: profile.name,
      branch: primary?.branchName ?? profile.branchNames[0] ?? "",
      relationshipManager: primary?.name ?? "",
      status: "active",
      caseStage: "prelogin",
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    };
    const updated = updateLoanFileInStorage(origin.loanFileId, {
      lenders: [lenderCase],
      lender: profile.name,
    });
    return {
      ok: Boolean(updated),
      returnTo: origin.returnTo,
      message: updated
        ? `${profile.name} linked — returning to your loan workflow.`
        : "Could not update the Loan File. Returning to origin.",
    };
  }

  return {
    ok: true,
    returnTo: origin.returnTo,
    message: `${profile.name} noted — returning to ${origin.from === "unknown" ? "your previous screen" : "origin"}.`,
  };
}
