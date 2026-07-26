/**
 * Active Opportunity Context — Enterprise Navigation SSOT.
 *
 * Opportunity Registry is the Single Source of Truth for the Opportunity Workspace.
 * Stages (Lead Creation → Documents → Credit Bench → LIFE) consume this shared
 * context — they must not independently resolve which Opportunity to load.
 *
 * `fileId` is optional Deal/LoanFile attachment only — never an Opportunity UUID.
 */

const STORAGE_KEY = "catalyst.active-opportunity-context";

export const DASHBOARD_ENTRY_PARAM = "entry";
export const DASHBOARD_ENTRY_VALUE = "dashboard";

/**
 * Shared Opportunity Workspace context (minimum contract).
 * Opportunity Workspace stages require `opportunityId`.
 * Deal / Loan execution may also carry optional `fileId` when attached.
 */
export interface ActiveOpportunityContext {
  /** Registry Opportunity id — required for Opportunity Workspace stages. */
  opportunityId?: string;
  /** Opportunity reference number (e.g. OPP-…). */
  opportunityReference?: string;
  /** Primary Contact id from Registry. */
  contactId?: string;
  /** Customer display name. */
  customer?: string;
  /** Product label / family. */
  product?: string;
  /** Requirement / lifecycle stage label. */
  stage?: string;
  /** Owner / RM display. */
  owner?: string;
  /**
   * Optional Deal / LoanFile id when attached later.
   * Never set to opportunityId.
   */
  fileId?: string;
  /** @deprecated Prefer `customer` */
  customerName?: string;
  /** @deprecated Prefer `opportunityReference` */
  label?: string;
}

/** Modules that participate in transaction-context preservation. */
export const TRANSACTION_CONTEXT_ROUTES = [
  "/credit-bench",
  "/document-center",
  "/credit-workbench",
  "/opportunities",
  "/deals",
  "/loan-files",
  "/my-deals",
  "/loan-journey",
] as const;

function normalizeContext(
  raw: Partial<ActiveOpportunityContext>,
): ActiveOpportunityContext | null {
  const opportunityId = raw.opportunityId?.trim() || undefined;
  const fileIdRaw = raw.fileId?.trim() || undefined;
  // Ban dual identity: fileId must never equal opportunityId.
  const fileId =
    fileIdRaw && fileIdRaw !== opportunityId ? fileIdRaw : undefined;

  if (!opportunityId && !fileId) return null;

  const customer = raw.customer?.trim() || raw.customerName?.trim() || undefined;
  const opportunityReference =
    raw.opportunityReference?.trim() || raw.label?.trim() || undefined;

  return {
    ...(opportunityId ? { opportunityId } : {}),
    ...(opportunityReference ? { opportunityReference } : {}),
    contactId: raw.contactId?.trim() || undefined,
    customer,
    product: raw.product?.trim() || undefined,
    stage: raw.stage?.trim() || undefined,
    owner: raw.owner?.trim() || undefined,
    ...(fileId ? { fileId } : {}),
    customerName: customer,
    label: opportunityReference,
  };
}

export function getActiveOpportunityContext(): ActiveOpportunityContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeContext(JSON.parse(raw) as Partial<ActiveOpportunityContext>);
  } catch {
    return null;
  }
}

export function setActiveOpportunityContext(
  ctx: Partial<ActiveOpportunityContext>,
): void {
  if (typeof window === "undefined") return;
  const next = normalizeContext(ctx);
  if (!next) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/**
 * True when the Opportunity selection screen may be shown.
 * Selection appears ONLY on explicit left-nav dashboard entry, or when there is
 * no active Opportunity context at all.
 */
export function shouldShowEntitySelectionScreen(options: {
  dashboardEntry: boolean;
  hasUrlContext: boolean;
}): boolean {
  if (options.dashboardEntry) return true;
  if (options.hasUrlContext) return false;
  const active = getActiveOpportunityContext();
  return !active?.opportunityId;
}

export function clearActiveOpportunityContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isDashboardNavEntry(
  searchParams: { get: (key: string) => string | null } | null | undefined,
): boolean {
  return searchParams?.get(DASHBOARD_ENTRY_PARAM) === DASHBOARD_ENTRY_VALUE;
}

/** Main-nav / explicit return to module dashboard (clears restore path). */
export function buildDashboardHref(baseHref: string): string {
  const url = new URL(baseHref, "https://local.invalid");
  url.searchParams.set(DASHBOARD_ENTRY_PARAM, DASHBOARD_ENTRY_VALUE);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function isTransactionContextRoute(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return (TRANSACTION_CONTEXT_ROUTES as readonly string[]).some(
    (r) => path === r || path.startsWith(`${r}/`),
  );
}
