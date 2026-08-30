/**
 * Company-borrower create invariant.
 *
 * Default: company borrowers require companyId.
 * Narrow exception: early COMPASS website drafts may start as company-borrower
 * with companyId null until the real ECM Company is collected and linked.
 * Non-COMPASS creates cannot use this exception.
 */

export const COMPASS_WEBSITE_SOURCE_CODE = "website_compass";

const PENDING_LIFECYCLES = new Set(["dialogue", "draft"]);
const PENDING_REQUIREMENT_STAGE = "lead_creation";

export type OpportunityBorrowerCreateInput = {
  primaryBorrowerKind?: "individual" | "company" | null;
  companyId?: string | null;
  primaryContactId?: string | null;
  sourceCode?: string | null;
  lifecycleStatus?: string | null;
  requirementStage?: string | null;
};

export type OpportunityBorrowerCreateDecision =
  | { ok: true; mode: "individual" }
  | { ok: true; mode: "company_linked" }
  | { ok: true; mode: "compass_pending_company" }
  | { ok: false; message: string };

export function allowsCompassPendingCompanyResolution(
  input: OpportunityBorrowerCreateInput,
): boolean {
  if ((input.primaryBorrowerKind ?? "individual") !== "company") return false;
  if (input.companyId?.trim()) return false;
  if (input.sourceCode !== COMPASS_WEBSITE_SOURCE_CODE) return false;
  if (!PENDING_LIFECYCLES.has(input.lifecycleStatus ?? "")) return false;
  if (input.requirementStage !== PENDING_REQUIREMENT_STAGE) return false;
  if (!input.primaryContactId?.trim()) return false;
  return true;
}

export function decideOpportunityBorrowerCreate(
  input: OpportunityBorrowerCreateInput,
): OpportunityBorrowerCreateDecision {
  const kind = input.primaryBorrowerKind ?? "individual";
  const companyId = input.companyId?.trim() || "";
  const contactId = input.primaryContactId?.trim() || "";

  if (kind !== "company") {
    if (!contactId) {
      return { ok: false, message: "primaryContactId must reference a valid Contact" };
    }
    return { ok: true, mode: "individual" };
  }

  if (companyId) {
    return { ok: true, mode: "company_linked" };
  }

  if (allowsCompassPendingCompanyResolution(input)) {
    return { ok: true, mode: "compass_pending_company" };
  }

  return {
    ok: false,
    message: "companyId is required when primary borrower is a Company",
  };
}

export function compassSubmitMissingCompany(input: {
  primaryBorrowerKind?: string | null;
  companyId?: string | null;
}): boolean {
  return input.primaryBorrowerKind === "company" && !input.companyId?.trim();
}
