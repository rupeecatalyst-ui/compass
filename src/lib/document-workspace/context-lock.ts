/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008
 * Pure context-lock contract. Resolve by canonical IDs only.
 */

import { ROUTES } from "@/constants/routes";
import {
  DOCUMENT_WORKSPACE_OWNER_TABS,
  type DocumentWorkspaceOwnerTabId,
} from "@/constants/document-workspace";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import type {
  DocumentWorkspaceContextInput,
  DocumentWorkspaceLockErrorCode,
  DocumentWorkspaceLockFailure,
  DocumentWorkspaceLockResult,
  DocumentWorkspaceResolvedContext,
  DocumentWorkspaceRestoreState,
} from "@/types/document-workspace-context";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const MOBILE_RE = /(?:\+91[\s-]?)?[6-9]\d{9}/;
const DISPLAY_NUMBER_RE = /^(OPP|DEAL|TK|TASK)[-_]/i;

export const DOCUMENT_WORKSPACE_RESTORE_PREFIX =
  "catalyst-one:document-workspace:restore:";

export function documentWorkspaceContextLooksLikePii(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (EMAIL_RE.test(trimmed)) return true;
  const compact = trimmed.replace(/[\s-]/g, "");
  return MOBILE_RE.test(compact);
}

export function isCanonicalDocumentWorkspaceId(value: string | null | undefined): boolean {
  const trimmed = value?.trim() || "";
  if (!trimmed) return false;
  if (documentWorkspaceContextLooksLikePii(trimmed)) return false;
  if (/\s/.test(trimmed)) return false;
  if (DISPLAY_NUMBER_RE.test(trimmed)) return false;
  return trimmed.length >= 8 && /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export function rejectNonCanonicalId(
  value: string | null | undefined,
  field: string,
): DocumentWorkspaceLockFailure | null {
  const trimmed = value?.trim() || "";
  if (!trimmed) return null;
  if (documentWorkspaceContextLooksLikePii(trimmed) || /\s/.test(trimmed)) {
    return fail(
      "NAME_OR_PII_RESOLUTION_FORBIDDEN",
      `${field} must be a canonical id — names, email, and mobile are not used to resolve Document Workspace.`,
    );
  }
  if (!isCanonicalDocumentWorkspaceId(trimmed)) {
    return fail("INVALID_ID", `${field} is not a canonical entity id.`);
  }
  return null;
}

function fail(
  code: DocumentWorkspaceLockErrorCode,
  message: string,
): DocumentWorkspaceLockFailure {
  return { ok: false, code, message };
}

export function parseDocumentWorkspaceSearchParams(
  search: URLSearchParams | { get: (key: string) => string | null },
): DocumentWorkspaceContextInput {
  const read = (key: string) => search.get(key)?.trim() || null;
  return {
    organizationId: read("organizationId") || read("organisationId"),
    contactId: read("contactId"),
    companyId: read("companyId"),
    opportunityId: read("opportunityId"),
    dealId: read("dealId"),
    ownerTab: read("ownerTab") || read("owner"),
    documentId: read("documentId"),
    ownerUserId: read("ownerUserId"),
    scope: read("scope"),
  };
}

export function parseOwnerTabParam(
  value: string | null | undefined,
): DocumentWorkspaceOwnerTabId {
  const allowed = DOCUMENT_WORKSPACE_OWNER_TABS.map((tab) => tab.id);
  if (value && (allowed as string[]).includes(value)) {
    return value as DocumentWorkspaceOwnerTabId;
  }
  return "primary";
}

export function buildDocumentWorkspaceHref(input: DocumentWorkspaceContextInput): string {
  const params = new URLSearchParams();
  const put = (key: string, value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  };
  put("organizationId", input.organizationId);
  put("contactId", input.contactId);
  put("companyId", input.companyId);
  put("opportunityId", input.opportunityId);
  put("dealId", input.dealId);
  put("ownerTab", input.ownerTab);
  put("documentId", input.documentId);
  put("ownerUserId", input.ownerUserId);
  put("scope", input.scope);
  const q = params.toString();
  return q ? `${ROUTES.DOCUMENT_WORKSPACE}?${q}` : ROUTES.DOCUMENT_WORKSPACE;
}

export function documentWorkspaceFingerprint(input: {
  organizationId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}): string {
  return [
    input.organizationId?.trim() || "",
    input.opportunityId?.trim() || "",
    input.dealId?.trim() || "",
    input.contactId?.trim() || "",
    input.companyId?.trim() || "",
  ].join("|");
}

export function lockMatchesCurrentDocumentWorkspaceRequest(
  lock: {
    organizationId?: string | null;
    opportunityId?: string | null;
    dealId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
  } | null,
  request: {
    organizationId?: string | null;
    opportunityId?: string | null;
    dealId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
  },
): boolean {
  if (!lock) return false;
  const reqOpp = request.opportunityId?.trim() || "";
  const reqDeal = request.dealId?.trim() || "";
  const reqContact = request.contactId?.trim() || "";
  const reqCompany = request.companyId?.trim() || "";
  const reqOrg = request.organizationId?.trim() || "";
  if (!reqOpp && !reqDeal) return false;
  if (reqOpp && (lock.opportunityId || "") !== reqOpp) return false;
  if (reqDeal && (lock.dealId || "") !== reqDeal) return false;
  if (reqContact && (lock.contactId || "") !== reqContact) return false;
  if (reqCompany && (lock.companyId || "") !== reqCompany) return false;
  if (reqOrg && (lock.organizationId || "") !== reqOrg) return false;
  return true;
}

export type DocumentWorkspaceClearedTransientUi = {
  switched: boolean;
  selectedIds: string[];
  previewId: string | null;
  composer: null;
  composerFingerprint: null;
  editingMessage: null;
  groupedDraft: string;
  coverBody: string;
  secureLink: string;
  lenderRecipientId: string;
  fullscreen: boolean;
  actionOpen: boolean;
};

export function documentWorkspaceTransientUiAfterFingerprintChange(input: {
  previousFingerprint: string | null;
  nextFingerprint: string;
}): DocumentWorkspaceClearedTransientUi {
  const previous = (input.previousFingerprint || "").trim();
  const next = (input.nextFingerprint || "").trim();
  const switched = Boolean(previous && next && previous !== next);
  if (!switched) {
    return {
      switched: false,
      selectedIds: [],
      previewId: null,
      composer: null,
      composerFingerprint: null,
      editingMessage: null,
      groupedDraft: "",
      coverBody: "",
      secureLink: "",
      lenderRecipientId: "",
      fullscreen: false,
      actionOpen: false,
    };
  }
  return {
    switched: true,
    selectedIds: [],
    previewId: null,
    composer: null,
    composerFingerprint: null,
    editingMessage: null,
    groupedDraft: "",
    coverBody: "",
    secureLink: "",
    lenderRecipientId: "",
    fullscreen: false,
    actionOpen: false,
  };
}

export function validateDocumentWorkspaceInputIds(
  input: DocumentWorkspaceContextInput,
): DocumentWorkspaceLockFailure | null {
  const fields: Array<[keyof DocumentWorkspaceContextInput, string]> = [
    ["organizationId", "organizationId"],
    ["contactId", "contactId"],
    ["companyId", "companyId"],
    ["opportunityId", "opportunityId"],
    ["dealId", "dealId"],
    ["documentId", "documentId"],
    ["ownerUserId", "ownerUserId"],
  ];
  for (const [key, label] of fields) {
    const rejected = rejectNonCanonicalId(input[key] as string | null | undefined, label);
    if (rejected) return rejected;
  }
  if (!input.opportunityId?.trim() && !input.dealId?.trim()) {
    return fail("MISSING_TRANSACTION", "Document Workspace requires an Opportunity or Deal id.");
  }
  return null;
}

export function assertOpportunityDealAlignment(input: {
  opportunityId: string;
  dealOpportunityId?: string | null;
  dealDeleted?: boolean;
}): DocumentWorkspaceLockFailure | null {
  if (input.dealDeleted) {
    return fail("DELETED", "The selected Deal is deleted.");
  }
  const dealOpp = input.dealOpportunityId?.trim() || "";
  if (!dealOpp || dealOpp !== input.opportunityId.trim()) {
    return fail(
      "OPPORTUNITY_DEAL_MISMATCH",
      "Deal does not belong to the selected Opportunity.",
    );
  }
  return null;
}

export function assertSameOrganization(input: {
  claimedOrganizationId?: string | null;
  recordOrganizationId: string;
  actorOrganizationId: string;
}): DocumentWorkspaceLockFailure | null {
  const recordOrg = input.recordOrganizationId.trim();
  const actorOrg = input.actorOrganizationId.trim();
  if (!recordOrg || !actorOrg || recordOrg !== actorOrg) {
    return fail("CROSS_ORGANIZATION", "Cross-organisation Document Workspace access is denied.");
  }
  const claimed = input.claimedOrganizationId?.trim();
  if (claimed && claimed !== recordOrg) {
    return fail("CROSS_ORGANIZATION", "Cross-organisation Document Workspace access is denied.");
  }
  return null;
}

export function assertOptionalPartyAlignment(input: {
  claimedContactId?: string | null;
  claimedCompanyId?: string | null;
  opportunityContactId?: string | null;
  opportunityCompanyId?: string | null;
}): DocumentWorkspaceLockFailure | null {
  const claimedContact = input.claimedContactId?.trim();
  const oppContact = input.opportunityContactId?.trim();
  if (claimedContact && oppContact && claimedContact !== oppContact) {
    return fail("CONTACT_OPPORTUNITY_MISMATCH", "Contact does not belong to the selected Opportunity.");
  }
  const claimedCompany = input.claimedCompanyId?.trim();
  const oppCompany = input.opportunityCompanyId?.trim();
  if (claimedCompany && oppCompany && claimedCompany !== oppCompany) {
    return fail("COMPANY_OPPORTUNITY_MISMATCH", "Company does not belong to the selected Opportunity.");
  }
  return null;
}

export function lockDocumentWorkspaceContext(input: {
  request: DocumentWorkspaceContextInput;
  actorOrganizationId: string;
  opportunity: {
    id: string;
    organizationId: string;
    opportunityNumber?: string | null;
    primaryContactId?: string | null;
    companyId?: string | null;
    primaryContactName?: string | null;
    companyName?: string | null;
    productLabel?: string | null;
    relationshipManagerUserId?: string | null;
    relationshipManagerName?: string | null;
    primaryOwnerUserId?: string | null;
    requirementStage?: string | null;
    isDeleted?: boolean;
  } | null;
  deal?: {
    id: string;
    organizationId: string;
    opportunityId?: string | null;
    dealNumber?: string | null;
    lenderName?: string | null;
    primaryCounterpartyName?: string | null;
    productLabel?: string | null;
    relationshipManagerUserId?: string | null;
    relationshipManagerName?: string | null;
    primaryOwnerUserId?: string | null;
    grossStage?: string | null;
    isDeleted?: boolean;
    archived?: boolean;
  } | null;
}): DocumentWorkspaceLockResult {
  const idError = validateDocumentWorkspaceInputIds(input.request);
  if (idError) return idError;

  if (!input.opportunity) {
    return fail("NOT_FOUND", "Opportunity was not found for the supplied id.");
  }
  if (input.opportunity.isDeleted) {
    return fail("DELETED", "The selected Opportunity is deleted.");
  }
  if (input.request.opportunityId && input.request.opportunityId.trim() !== input.opportunity.id) {
    return fail("INVALID_ID", "Opportunity id does not match the loaded record.");
  }

  const orgError = assertSameOrganization({
    claimedOrganizationId: input.request.organizationId,
    recordOrganizationId: input.opportunity.organizationId,
    actorOrganizationId: input.actorOrganizationId,
  });
  if (orgError) return orgError;

  const requestedDealId = input.request.dealId?.trim() || "";
  if (requestedDealId) {
    if (!input.deal) {
      return fail("NOT_FOUND", "Deal was not found for the supplied id.");
    }
    if (input.deal.id !== requestedDealId) {
      return fail("INVALID_ID", "Deal id does not match the loaded record.");
    }
    const dealOrgError = assertSameOrganization({
      claimedOrganizationId: input.request.organizationId,
      recordOrganizationId: input.deal.organizationId,
      actorOrganizationId: input.actorOrganizationId,
    });
    if (dealOrgError) return dealOrgError;
    const mismatch = assertOpportunityDealAlignment({
      opportunityId: input.opportunity.id,
      dealOpportunityId: input.deal.opportunityId,
      dealDeleted: input.deal.isDeleted,
    });
    if (mismatch) return mismatch;
  } else if (input.deal) {
    return fail("INVALID_ID", "A Deal was loaded without a Deal id in the lock contract.");
  }

  const partyError = assertOptionalPartyAlignment({
    claimedContactId: input.request.contactId,
    claimedCompanyId: input.request.companyId,
    opportunityContactId: input.opportunity.primaryContactId,
    opportunityCompanyId: input.opportunity.companyId,
  });
  if (partyError) return partyError;

  const deal = requestedDealId ? input.deal : null;
  const context: DocumentWorkspaceResolvedContext = {
    organizationId: input.opportunity.organizationId,
    contactId: input.opportunity.primaryContactId?.trim() || input.request.contactId?.trim() || null,
    companyId: input.opportunity.companyId?.trim() || input.request.companyId?.trim() || null,
    opportunityId: input.opportunity.id,
    opportunityNumber: input.opportunity.opportunityNumber?.trim() || null,
    dealId: deal?.id ?? null,
    dealNumber: deal?.dealNumber?.trim() || null,
    lenderName: deal?.lenderName?.trim() || deal?.primaryCounterpartyName?.trim() || null,
    customerName: input.opportunity.primaryContactName?.trim() || null,
    companyName: input.opportunity.companyName?.trim() || null,
    product: deal?.productLabel?.trim() || input.opportunity.productLabel?.trim() || null,
    assignedEmployeeId:
      deal?.relationshipManagerUserId?.trim() ||
      deal?.primaryOwnerUserId?.trim() ||
      input.opportunity.relationshipManagerUserId?.trim() ||
      input.opportunity.primaryOwnerUserId?.trim() ||
      null,
    assignedEmployeeName:
      deal?.relationshipManagerName?.trim() || input.opportunity.relationshipManagerName?.trim() || null,
    workflowStage: deal?.grossStage?.trim() || input.opportunity.requirementStage?.trim() || null,
    fingerprint: "",
  };
  context.fingerprint = documentWorkspaceFingerprint(context);
  return { ok: true, context };
}

export function filterRegistryRecordsForLockedContext(input: {
  records: DocumentRegistryRecord[];
  opportunityId: string;
  dealId?: string | null;
}): DocumentRegistryRecord[] {
  const opportunityId = input.opportunityId.trim();
  const dealId = input.dealId?.trim() || "";
  return input.records.filter((record) => {
    const links = record.links;
    const recordOpp = links.opportunityId?.trim() || "";
    const recordDeal = links.dealId?.trim() || "";
    if (recordOpp && recordOpp !== opportunityId) return false;

    if (dealId) {
      if (recordDeal && recordDeal !== dealId) return false;
      if (links.documentScope === "lender" && recordDeal && recordDeal !== dealId) return false;
      return true;
    }

    if (recordDeal) return false;
    if (links.documentScope === "lender") return false;
    return true;
  });
}

export function composerMustRefuseStaleContext(input: {
  openedFingerprint: string | null | undefined;
  currentFingerprint: string | null | undefined;
  authorised?: boolean;
}): boolean {
  if (input.authorised === false) return true;
  const opened = input.openedFingerprint?.trim() || "";
  const current = input.currentFingerprint?.trim() || "";
  if (!opened || !current) return true;
  return opened !== current;
}

export function hasUnsavedDocumentWorkspaceDraft(input: {
  groupedDraft?: string | null;
  coverBody?: string | null;
  composerOpen?: boolean;
}): boolean {
  if (input.composerOpen) return true;
  if (input.groupedDraft?.trim()) return true;
  if (input.coverBody?.trim()) return true;
  return false;
}

export function emptyDocumentWorkspaceRestore(
  ownerTab: DocumentWorkspaceOwnerTabId = "primary",
): DocumentWorkspaceRestoreState {
  return {
    ownerTab,
    documentId: null,
    selectedIds: [],
    tableScroll: 0,
    actionOpen: false,
    previewOpen: false,
  };
}

export function restoreKeyForFingerprint(fingerprint: string): string {
  return `${DOCUMENT_WORKSPACE_RESTORE_PREFIX}${fingerprint}`;
}

export function readDocumentWorkspaceRestore(
  fingerprint: string,
): DocumentWorkspaceRestoreState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(restoreKeyForFingerprint(fingerprint));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentWorkspaceRestoreState;
    return {
      ...emptyDocumentWorkspaceRestore(parseOwnerTabParam(parsed.ownerTab)),
      ...parsed,
      ownerTab: parseOwnerTabParam(parsed.ownerTab),
    };
  } catch {
    return null;
  }
}

export function writeDocumentWorkspaceRestore(
  fingerprint: string,
  state: DocumentWorkspaceRestoreState,
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(restoreKeyForFingerprint(fingerprint), JSON.stringify(state));
}

export function documentWorkspaceContextLeaksPii(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return documentWorkspaceContextLooksLikePii(value);
  if (Array.isArray(value)) return value.some(documentWorkspaceContextLeaksPii);
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/email|mobile|phone|telephone|whatsapp/i.test(key)) return true;
      if (documentWorkspaceContextLeaksPii(nested)) return true;
    }
  }
  return false;
}
