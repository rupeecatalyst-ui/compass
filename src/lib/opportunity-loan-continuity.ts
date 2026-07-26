/**
 * Prompt 014 — Opportunity → Loan Workspace continuity.
 * Prefer opening the known active loan directly; fall back to the list
 * only when multiple loans exist or the user explicitly browses.
 */

import { ROUTES } from "@/constants/routes";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { loadDealsSync } from "@/lib/enterprise-deal/deal-data-access";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import type { LoanFile } from "@/types/catalyst-one";

const STORAGE_KEY = "c1:opportunity-active-loan";

type ActiveLoanMap = Record<string, string>;

function readMap(): ActiveLoanMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ActiveLoanMap;
  } catch {
    return {};
  }
}

function writeMap(map: ActiveLoanMap) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

export function rememberOpportunityActiveLoan(opportunityId: string, loanFileId: string): void {
  if (!opportunityId || !loanFileId) return;
  const map = readMap();
  map[opportunityId] = loanFileId;
  writeMap(map);
}

export function getRememberedOpportunityActiveLoan(opportunityId: string): string | null {
  if (!opportunityId) return null;
  return readMap()[opportunityId] ?? null;
}

export function clearRememberedOpportunityActiveLoan(opportunityId: string): void {
  const map = readMap();
  delete map[opportunityId];
  writeMap(map);
}

export interface OpportunityLoanContactHint {
  id?: string;
  name?: string;
  mobilePrimary?: string;
  mobile?: string;
}

function normalizeMobile(value?: string): string {
  return (value ?? "").replace(/\D/g, "");
}

function loadAllLoanFiles(): LoanFile[] {
  if (typeof window === "undefined") return getInitialLoanFiles();
  return loadDealsSync("opportunity_workspace").files;
}

/** Match loans to an opportunity via remembered link + contact identity. */
export function resolveLoansForOpportunity(
  opportunityId: string,
  contact?: OpportunityLoanContactHint | null,
): LoanFile[] {
  const files = loadAllLoanFiles().filter((f) => !f.archived);
  const remembered = getRememberedOpportunityActiveLoan(opportunityId);
  if (remembered) {
    const hit = files.find((f) => f.id === remembered);
    if (hit) return [hit];
  }

  if (!contact) return [];

  const mobile = normalizeMobile(contact.mobilePrimary ?? contact.mobile);
  const name = (contact.name ?? "").trim().toLowerCase();
  const customerId = contact.id;

  return files.filter((f) => {
    if (customerId && f.customerId === customerId) return true;
    const fileMobile = normalizeMobile(f.customerMobile);
    if (mobile && fileMobile && mobile === fileMobile) return true;
    if (name && f.customerName?.trim().toLowerCase() === name) return true;
    return false;
  });
}

export function resolveActiveLoanFileIdForOpportunity(
  opportunityId: string,
  contact?: OpportunityLoanContactHint | null,
  options?: { browseAll?: boolean },
): string | null {
  if (options?.browseAll) return null;
  const matches = resolveLoansForOpportunity(opportunityId, contact);
  if (matches.length === 1) return matches[0]!.id;
  const remembered = getRememberedOpportunityActiveLoan(opportunityId);
  if (remembered && matches.some((f) => f.id === remembered)) return remembered;
  return null;
}

export function buildOpportunityLoanWorkspaceHref(input: {
  opportunityId: string;
  contact?: OpportunityLoanContactHint | null;
  /** Explicit request to show the list even when a single loan is known. */
  browseAll?: boolean;
}): string {
  if (input.browseAll) {
    return ROUTES.MY_DEALS;
  }
  const fileId = resolveActiveLoanFileIdForOpportunity(
    input.opportunityId,
    input.contact,
  );
  if (!fileId) return ROUTES.MY_DEALS;
  return buildDealWorkspaceHref({
    fileId,
    opportunityId: input.opportunityId,
    tab: "lenders",
  });
}
