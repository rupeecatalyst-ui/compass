/**
 * Active Opportunity Context — Enterprise Navigation SSOT.
 * Preserved while the user works inside a transaction; cleared only on
 * explicit dashboard entry, browse-all, or picking another case.
 */

const STORAGE_KEY = "catalyst.active-opportunity-context";

export const DASHBOARD_ENTRY_PARAM = "entry";
export const DASHBOARD_ENTRY_VALUE = "dashboard";

export interface ActiveOpportunityContext {
  fileId: string;
  opportunityId?: string;
  customerName?: string;
  product?: string;
  label?: string;
}

/** Modules that participate in transaction-context preservation. */
export const TRANSACTION_CONTEXT_ROUTES = [
  "/credit-bench",
  "/document-center",
  "/credit-workbench",
  "/opportunities",
  "/loan-files",
] as const;

export function getActiveOpportunityContext(): ActiveOpportunityContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveOpportunityContext;
    if (!parsed?.fileId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveOpportunityContext(ctx: ActiveOpportunityContext): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore quota */
  }
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
