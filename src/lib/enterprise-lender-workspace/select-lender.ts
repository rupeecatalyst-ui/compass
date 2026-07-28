import {
  placeholderSaveLifeSelection,
  placeholderSelectLifeInstitution,
  placeholderSetLifeDraft,
  type PlaceholderLifeInstitution,
} from "@/components/catalyst-one/opportunity-workspace/providers/workspace-placeholder-provider";
import { loadDealsSync, updateDeal } from "@/lib/enterprise-deal/deal-data-access";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { buildLenderMasterSnapshot } from "@/lib/enterprise-lender-registry/auto-populate";
import { localLenderRegistryStore } from "@/lib/enterprise-lender-registry/local-store";
import {
  isStrategicShortlistAtLimit,
  isStrategicShortlistLimitError,
  syncShortlistToIdentified,
  upsertStrategicShortlistItem,
} from "@/lib/strategic-lender-pipeline";
import { STRATEGY_SHORTLIST_LIMIT_GUIDANCE } from "@/constants/strategic-lender-shortlist";
import type { ElwLenderProfile, ElwOriginContext } from "@/types/enterprise-lender-workspace";

export interface ElwSelectLenderResult {
  ok: boolean;
  returnTo: string;
  message: string;
}

function resolveMasterFromProfile(profile: ElwLenderProfile) {
  const registry =
    localLenderRegistryStore.getLender(profile.lenderId) ??
    localLenderRegistryStore
      .queryLenders({ pageSize: 5000 })
      .items.find(
        (l) =>
          l.code === profile.code ||
          (l.displayName || l.label).toLowerCase() === profile.name.toLowerCase(),
      );
  if (!registry) {
    return {
      lender: profile.displayName || profile.name,
      lenderRef: profile.lenderRef,
      lenderCode: profile.code,
      lenderLegalName: profile.legalName || profile.name,
      lenderDisplayName: profile.displayName || profile.name,
      lenderClassification: profile.classification,
      lenderInstitutionCategory: profile.institutionCategory,
      lenderWebsite: profile.website,
      lenderCustomerCarePhone: profile.customerCarePhone,
      lenderCustomerCareEmail: profile.customerCareEmail,
      lenderHeadquarters: profile.headquartersCity,
      lenderRegistryId: profile.lenderId,
    };
  }
  const snapshot = buildLenderMasterSnapshot(
    registry,
    localLenderRegistryStore.listContacts(registry.id),
  );
  return {
    lender: snapshot.displayName,
    lenderRef: profile.lenderRef || `lender:${snapshot.lenderCode}`,
    lenderCode: snapshot.lenderCode,
    lenderLegalName: snapshot.legalName,
    lenderDisplayName: snapshot.displayName,
    lenderClassification: snapshot.classification ?? undefined,
    lenderInstitutionCategory: snapshot.institutionCategory,
    lenderWebsite: snapshot.website ?? undefined,
    lenderCustomerCarePhone: snapshot.customerCarePhone ?? undefined,
    lenderCustomerCareEmail: snapshot.customerCareEmail ?? undefined,
    lenderHeadquarters: snapshot.headquartersLabel ?? undefined,
    lenderRegistryId: snapshot.lenderId,
  };
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
  const master = resolveMasterFromProfile(profile);

  if (origin.from === "opportunity_workspace" && origin.opportunityId) {
    const institution: PlaceholderLifeInstitution = {
      lenderRef: master.lenderRef,
      lenderName: master.lender,
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
        lenderName: master.lender,
        executorName: primary.name,
        branchName: primary.branchName,
        contactId: primary.contactId,
        lenderRef: master.lenderRef,
        productRefs: institution.productRefs,
        businessMappingRefs: institution.businessMappingRefs,
        recommended: true,
        successProbability: profile.metrics.successProbability,
        productCompatible: true,
        eligibility: "eligible",
      });
      placeholderSaveLifeSelection(origin.opportunityId);
    }
    if (isStrategicShortlistAtLimit(origin.opportunityId)) {
      return {
        ok: false,
        returnTo: origin.returnTo,
        message: STRATEGY_SHORTLIST_LIMIT_GUIDANCE,
      };
    }
    try {
      upsertStrategicShortlistItem(origin.opportunityId, {
        lenderRef: master.lenderRef,
        lenderName: master.lender,
        product: profile.products[0]?.label,
        productRefs: institution.productRefs,
        successProbability: profile.metrics.successProbability,
        specialNotes: "Selected from Enterprise Lender Workspace",
        branchName: primary?.branchName ?? profile.branchNames[0],
        executorName: primary?.name,
        createdBy: "RM",
      });
    } catch (err) {
      if (isStrategicShortlistLimitError(err)) {
        return {
          ok: false,
          returnTo: origin.returnTo,
          message: err.message || STRATEGY_SHORTLIST_LIMIT_GUIDANCE,
        };
      }
      throw err;
    }
    return {
      ok: true,
      returnTo: origin.returnTo,
      message: `${master.lender} (${master.lenderCode}) selected — returning to Opportunity Workspace.`,
    };
  }

  if ((origin.from === "loan_files" || origin.from === "life") && origin.loanFileId) {
    const files = loadDealsSync("loan_workspace").files ?? getInitialLoanFiles();
    const file = files.find((f) => f.id === origin.loanFileId);
    const existing = file?.lenders?.find(
      (c) =>
        c.lender.toLowerCase() === master.lender.toLowerCase() ||
        c.lenderRef === master.lenderRef ||
        c.lenderCode === master.lenderCode,
    );
    if (existing) {
      return {
        ok: true,
        returnTo: origin.returnTo,
        message: `${master.lender} already on pipeline — opening existing case (no duplicate).`,
      };
    }

    const opportunityId = origin.opportunityId ?? `loan:${origin.loanFileId}`;
    if (isStrategicShortlistAtLimit(opportunityId)) {
      return {
        ok: false,
        returnTo: origin.returnTo,
        message: STRATEGY_SHORTLIST_LIMIT_GUIDANCE,
      };
    }
    let shortlist;
    try {
      shortlist = upsertStrategicShortlistItem(opportunityId, {
        lenderRef: master.lenderRef,
        lenderName: master.lender,
        product: profile.products[0]?.label,
        productRefs: profile.products.map((p) => p.productRef),
        successProbability: profile.metrics.successProbability,
        branchName: primary?.branchName ?? profile.branchNames[0],
        executorName: primary?.name,
        specialNotes: "Selected from Enterprise Lender Workspace",
        createdBy: "RM",
      });
    } catch (err) {
      if (isStrategicShortlistLimitError(err)) {
        return {
          ok: false,
          returnTo: origin.returnTo,
          message: err.message || STRATEGY_SHORTLIST_LIMIT_GUIDANCE,
        };
      }
      throw err;
    }
    const sync = syncShortlistToIdentified(origin.loanFileId, opportunityId, shortlist);
    if (!sync.ok) {
      // Fallback single upsert if sync failed to load file
      const now = new Date().toISOString();
      updateDeal(
        origin.loanFileId,
        {
          lenders: [
            {
              id: `elw-${profile.lenderId}-${Date.now()}`,
              ...master,
              branch: primary?.branchName ?? profile.branchNames[0] ?? master.lenderHeadquarters ?? "",
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
          lender: master.lender,
        },
        undefined,
        "loan_workspace",
      );
    }
    return {
      ok: true,
      returnTo: origin.returnTo,
      message: sync.message || `${master.lender} (${master.lenderCode}) linked to Identified.`,
    };
  }

  return {
    ok: true,
    returnTo: origin.returnTo,
    message: `${master.lender} noted — returning to ${origin.from === "unknown" ? "your previous screen" : "origin"}.`,
  };
}
