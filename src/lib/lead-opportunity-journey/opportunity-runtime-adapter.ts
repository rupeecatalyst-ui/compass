/**
 * FS-01 — Opportunity Runtime Adapter (Foundation Stabilization).
 *
 * Constitutional rule: Opportunity Registry is the ONLY runtime authority for
 * Opportunity Workspace stages (Lead Creation · Documents · Credit Bench · LIFE).
 *
 * LoanFile may appear only as an optional Deal-attachment compatibility projection.
 * This adapter never treats LoanFile as SSOT.
 *
 * Compatibility shape: stages still consume a LoanFile-typed view model so UI
 * is not redesigned — the view is projected FROM Opportunity (+ Contact).
 */

import { listEcmContacts } from "@/lib/enterprise-contact-master";
import { loadDealsSync } from "@/lib/enterprise-deal/deal-data-access";
import {
  enterpriseOpportunityApiClient,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import {
  clearActiveOpportunityContext,
  getActiveOpportunityContext,
  setActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { rememberOpportunityRegistryContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import { resolveOpportunityLoanStructureParticipants } from "@/lib/lead-opportunity-journey/opportunity-loan-structure";
import type { LoanFile } from "@/types/catalyst-one";
import type { EcmContact } from "@/types/enterprise-contact-master";

/** LoanFile view may carry Opportunity identity without mutating the core LoanFile contract. */
type LoanFileOpportunityView = LoanFile & {
  opportunityId?: string;
};

export const FS01_OPPORTUNITY_RUNTIME_MARKER = "__fs01OpportunityRuntime" as const;

/**
 * LoanFile-shaped view for Opportunity stages.
 * Business fields come only from Opportunity Registry (+ Contact identity).
 * Empty strings / null amountCaptured mean "Not Specified" — never fabricated.
 */
export type OpportunityRuntimeCase = LoanFileOpportunityView & {
  [FS01_OPPORTUNITY_RUNTIME_MARKER]: true;
  enterpriseOpportunityId: string;
  opportunityId: string;
  /** Explicit capture flag for requested amount (null in DB → false). */
  amountCaptured: boolean;
};

const opportunityRecordCache = new Map<string, EnterpriseOpportunityApiRecord>();
const runtimeCaseCache = new Map<string, LoanFileOpportunityView>();

export function cacheOpportunityRecord(opp: EnterpriseOpportunityApiRecord): void {
  if (!opp?.id) return;
  opportunityRecordCache.set(opp.id, opp);
}

export function getCachedOpportunityRecord(
  opportunityId: string,
): EnterpriseOpportunityApiRecord | null {
  const id = opportunityId?.trim();
  if (!id) return null;
  return opportunityRecordCache.get(id) ?? null;
}

/**
 * CO-CHANAKYA-001 — Journey City SSOT is Opportunity.cityLabel.
 * Contact city may seed when Opportunity has not yet captured geography.
 */
export function resolveOpportunityCityLabels(
  opp: Pick<EnterpriseOpportunityApiRecord, "cityLabel" | "stateLabel">,
  contact?: Pick<EcmContact, "city" | "state"> | null,
): { city: string; state: string } {
  return {
    city: opp.cityLabel?.trim() || contact?.city?.trim() || "",
    state: opp.stateLabel?.trim() || contact?.state?.trim() || "",
  };
}

export function isOpportunityRuntimeCase(
  file: LoanFile | null | undefined,
): file is OpportunityRuntimeCase {
  return Boolean(
    file &&
      (file as OpportunityRuntimeCase)[FS01_OPPORTUNITY_RUNTIME_MARKER] === true,
  );
}

/** True when this id is an Opportunity runtime key (not a Deal/LoanFile attachment). */
export function isOpportunityRuntimeKey(id: string | null | undefined): boolean {
  if (!id?.trim()) return false;
  const hit = runtimeCaseCache.get(id);
  if (hit && isOpportunityRuntimeCase(hit)) return true;
  return opportunityRecordCache.has(id);
}

function cacheRuntimeCase(file: LoanFileOpportunityView): void {
  runtimeCaseCache.set(file.id, file);
  const oppId = file.enterpriseOpportunityId || file.opportunityId;
  if (oppId && oppId !== file.id) {
    runtimeCaseCache.set(oppId, file);
  }
}

export function peekOpportunityRuntimeCase(
  opportunityIdOrCaseId: string | null | undefined,
): LoanFile | null {
  if (!opportunityIdOrCaseId?.trim()) return null;
  return runtimeCaseCache.get(opportunityIdOrCaseId.trim()) ?? null;
}

function employmentFromContact(contact: EcmContact | null | undefined): string {
  if (!contact) return "";
  const fromProfile = contact.roleProfiles?.customer?.employmentType?.trim();
  return fromProfile || contact.employmentType?.trim() || "";
}

/** Opportunity.employmentTypeCode is SSOT when captured (Lead Information). */
function employmentFromOpportunity(
  opp: EnterpriseOpportunityApiRecord,
  contact?: EcmContact | null,
): string {
  const fromOpp = opp.employmentTypeCode?.trim() || "";
  if (fromOpp) return fromOpp;
  return employmentFromContact(contact);
}

/**
 * Project Registry Opportunity → runtime case (LoanFile-shaped structure only).
 *
 * Constitutional: do not synthesize business values.
 * - Product: only from Opportunity (may be create-time default Home Loan)
 * - Amount: only from requestedAmount when set; else uncaptured
 * - lendingType: only from Opportunity lendingExtension when set
 * - transactionType: only from Opportunity columns when set
 * LoanFile enums are left blank for uncaptured fields (UI → Not Specified).
 */
export function projectOpportunityToRuntimeCase(
  opp: EnterpriseOpportunityApiRecord,
  contact?: EcmContact | null,
): OpportunityRuntimeCase {
  const borrower = resolveOpportunityBorrowerIdentity(opp);
  const isCompanyBorrower = borrower.kind === "company";
  const resolved =
    contact ??
    (opp.primaryContactId
      ? listEcmContacts().find((c) => c.id === opp.primaryContactId) ?? null
      : null);
  const amountCaptured =
    typeof opp.requestedAmount === "number" && !Number.isNaN(opp.requestedAmount);
  const amount = amountCaptured ? (opp.requestedAmount as number) : 0;
  const product = opp.productLabel?.trim() || opp.productCode?.trim() || "";
  const customerName =
    borrower.displayName ||
    (!isCompanyBorrower ? resolved?.name?.trim() || "" : "");
  const transactionTypeRaw = opp.transactionType?.trim() || "";
  const ext =
    opp.lendingExtension && typeof opp.lendingExtension === "object"
      ? (opp.lendingExtension as Record<string, unknown>)
      : {};
  const lendingTypeFromExt =
    typeof ext.lendingType === "string" ? ext.lendingType.trim() : "";
  const lendingTypeRaw =
    lendingTypeFromExt === "secured" ||
    lendingTypeFromExt === "unsecured" ||
    lendingTypeFromExt === "hybrid"
      ? lendingTypeFromExt
      : "";
  // Opportunity has no lendingType column — SSOT is lendingExtension.lendingType when captured.
  // BAT #12 — Loan Structure participants from lendingExtension.participants (canonical model).
  const participants = resolveOpportunityLoanStructureParticipants(opp, resolved);

  const priorityRaw = opp.priority?.trim() || "";
  const stageRaw = opp.requirementStage?.trim() || "";

  const geo = resolveOpportunityCityLabels(opp, resolved);
  const projected: OpportunityRuntimeCase = {
    [FS01_OPPORTUNITY_RUNTIME_MARKER]: true,
    amountCaptured,
    id: opp.id,
    fileNumber: opp.opportunityNumber,
    customerId: borrower.partyEntityId,
    // Empty → UI Not Specified (never invent "Customer")
    customerName,
    customerMobile:
      opp.primaryContactMobile?.trim() || resolved?.mobilePrimary?.trim() || "",
    customerEmail:
      opp.primaryContactEmail?.trim() ||
      resolved?.personalEmail?.trim() ||
      resolved?.officialEmail?.trim() ||
      "",
    city: geo.city,
    state: geo.state,
    employmentType: employmentFromOpportunity(opp, resolved),
    lendingType: lendingTypeRaw as LoanFile["lendingType"],
    transactionType: (transactionTypeRaw || "") as LoanFile["transactionType"],
    loanProduct: product,
    loanAmount: amount,
    requiredAmount: amount,
    lender: "",
    // Empty stage → Not Specified; do not invent raw_lead at runtime
    stage: stageRaw as LoanFile["stage"],
    relationshipManager: opp.relationshipManagerName?.trim() || "",
    // Empty priority → structural cast only; never invent "medium"
    priority: priorityRaw as LoanFile["priority"],
    // Opportunity Business Source (SSOT) — display via formatOpportunitySourceDisplay
    source: opp.sourceCode?.trim() || "",
    sourceContactId: opp.sourceContactId?.trim() || undefined,
    sourceContactName: opp.sourceContactName?.trim() || undefined,
    daysInStage: 0,
    expectedRevenue: 0,
    revenuePercent: 0,
    revenueReceived: 0,
    expectedDisbursement: "",
    loginDate: "",
    expectedLoginDate: "",
    sanctionAmount: 0,
    disbursementAmount: 0,
    interestRate: 0,
    tenure: 0,
    // LoanFile shape placeholders — not Opportunity business truth (OW must not display as facts)
    status: "on_track",
    progress: 0,
    createdAt: opp.createdAt || new Date().toISOString(),
    enterpriseOpportunityId: opp.id,
    opportunityId: opp.id,
    opportunityNumber: opp.opportunityNumber,
    documents: [],
    tasks: [],
    timeline: [],
    internalNotes: "",
    isUrgent: false,
    isDelayed: false,
    participants,
  };

  cacheOpportunityRecord(opp);
  cacheRuntimeCase(projected);
  return projected;
}

/**
 * Compatibility: remember Deal/LoanFile id on context only.
 * Do NOT return LoanFile business payload into Opportunity Workspace.
 * Structure translation only — Opportunity remains business SSOT.
 */
export function stampOpportunityOnLegacyLoanFile(
  file: LoanFile,
  opp: EnterpriseOpportunityApiRecord,
  contact?: EcmContact | null,
): OpportunityRuntimeCase {
  const ctx = rememberOpportunityRegistryContext(opp);
  const legacyId = opp.legacyLoanFileId?.trim() || file.id;
  if (legacyId && legacyId !== opp.id) {
    setActiveOpportunityContext({ ...ctx, fileId: legacyId });
  }
  return projectOpportunityToRuntimeCase(opp, contact);
}

function rememberCompatFile(
  hit: LoanFileOpportunityView,
  opportunityId?: string | null,
): void {
  setActiveOpportunityContext({
    fileId: hit.id,
    opportunityId: opportunityId ?? hit.enterpriseOpportunityId ?? hit.opportunityId,
    customer: hit.customerName,
    product: hit.loanProduct,
    opportunityReference: hit.opportunityNumber || hit.fileNumber,
  });
}

function resolveLegacyLoanFile(fileId: string | null | undefined): LoanFile | null {
  if (!fileId?.trim()) return null;
  const files = loadDealsSync("opportunity_workspace").files ?? [];
  return files.find((f) => f.id === fileId && !f.archived) ?? null;
}

/**
 * Sync peek — uses Registry cache / prior resolve. Prefer async resolver for stages.
 */
export function resolveOpportunityRuntimeCaseSync(opts: {
  fileId?: string | null;
  opportunityId?: string | null;
  dashboardEntry?: boolean;
}): LoanFile | null {
  if (opts.dashboardEntry) {
    clearActiveOpportunityContext();
    return null;
  }

  const ctx = getActiveOpportunityContext();
  const opportunityId =
    opts.opportunityId?.trim() || ctx?.opportunityId?.trim() || null;
  const fileId = opts.fileId?.trim() || ctx?.fileId?.trim() || null;

  if (opportunityId) {
    const cachedCase = peekOpportunityRuntimeCase(opportunityId);
    if (cachedCase) return cachedCase;

    const opp = getCachedOpportunityRecord(opportunityId);
    if (opp) {
      const legacyId =
        opp.legacyLoanFileId?.trim() ||
        (fileId && fileId !== opportunityId ? fileId : null);
      if (legacyId) {
        const legacy = resolveLegacyLoanFile(legacyId);
        if (legacy) {
          return stampOpportunityOnLegacyLoanFile(legacy, opp);
        }
      }
      rememberOpportunityRegistryContext(opp);
      return projectOpportunityToRuntimeCase(opp);
    }
  }

  if (fileId && fileId !== opportunityId) {
    const legacy = resolveLegacyLoanFile(fileId);
    if (legacy) {
      rememberCompatFile(legacy, opportunityId);
      return legacy;
    }
  }

  return null;
}

/**
 * Canonical Opportunity-stage runtime resolver (FS-01).
 * Always prefers Opportunity Registry when opportunityId is known.
 */
export async function resolveOpportunityRuntimeCase(opts: {
  fileId?: string | null;
  opportunityId?: string | null;
  dashboardEntry?: boolean;
}): Promise<LoanFile | null> {
  if (opts.dashboardEntry) {
    clearActiveOpportunityContext();
    return null;
  }

  const ctx = getActiveOpportunityContext();
  const opportunityId =
    opts.opportunityId?.trim() || ctx?.opportunityId?.trim() || null;
  const fileId = opts.fileId?.trim() || ctx?.fileId?.trim() || null;

  if (opportunityId) {
    try {
      const opp = await enterpriseOpportunityApiClient.getOpportunity(opportunityId);
      cacheOpportunityRecord(opp);
      rememberOpportunityRegistryContext(opp);

      const legacyId =
        opp.legacyLoanFileId?.trim() ||
        (fileId && fileId !== opportunityId ? fileId : null);
      if (legacyId) {
        const legacy = resolveLegacyLoanFile(legacyId);
        if (legacy) {
          return stampOpportunityOnLegacyLoanFile(legacy, opp);
        }
      }

      return projectOpportunityToRuntimeCase(opp);
    } catch {
      const sync = resolveOpportunityRuntimeCaseSync({
        fileId,
        opportunityId,
      });
      if (sync) return sync;
    }
  }

  // Compatibility only: Deal / Loan Workspace opened without Opportunity id.
  if (fileId) {
    const legacy = resolveLegacyLoanFile(fileId);
    if (legacy) {
      rememberCompatFile(legacy, opportunityId);
      cacheRuntimeCase(legacy);
      return legacy;
    }
  }

  return null;
}
