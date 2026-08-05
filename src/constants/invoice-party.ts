/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Invoice Party (Accounting Master) SSOT.
 *
 * Invoice Party = entity against whom Rupee Catalyst raises its commission invoice
 * for a Deal. Not the loan disbursement beneficiary. Not necessarily the lender.
 *
 * Deal Workspace reads ONLY from Accounting → Invoice Party Master.
 */

import {
  migrateLegacyStage,
} from "@/constants/loan-stage-master";
import type { PipelineStage } from "@/types/catalyst-one";

/** Non-blocking Action Center / readiness copy (CO-DWS-001C). */
export const INVOICE_PARTY_READINESS_HINT =
  "Invoice Party has not yet been configured.";

export const INVOICE_PARTY_ACTION_CENTER_TITLE = "Accounting Setup Pending";

export const INVOICE_PARTY_ACTION_CENTER_ACTION = "Configure Invoice Party";

/**
 * @deprecated CO-BUG-001 — Invoice Party is never stage-gated for Lender Pipeline / Deal Save.
 * Kept for historical imports only. Prefer Action Center advisory when opening Accounting actions.
 */
export const INVOICE_PARTY_REQUIRED_FROM_STAGE: PipelineStage = "logged_in";

/**
 * Hard-gate copy for Accounting operations ONLY
 * (invoice generation · commission booking · payment entry · accounting posting).
 * Must never appear as a Lender Pipeline / Deal Save / stage-transition error.
 */
export const INVOICE_PARTY_REQUIRED_MESSAGE =
  "This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding.";

/** Party classification on the Master (accounting taxonomy). */
export const INVOICE_PARTY_TYPES = [
  "customer",
  "lender",
  "builder",
  "channel_partner",
  "chartered_accountant",
  "direct_corporate",
  "intermediary",
  "other",
] as const;

export type InvoicePartyType = (typeof INVOICE_PARTY_TYPES)[number];

export const INVOICE_PARTY_TYPE_OPTIONS: ReadonlyArray<{
  id: InvoicePartyType;
  label: string;
}> = [
  { id: "customer", label: "Customer" },
  { id: "lender", label: "Lender" },
  { id: "builder", label: "Builder" },
  { id: "channel_partner", label: "Channel Partner" },
  { id: "chartered_accountant", label: "Chartered Accountant" },
  { id: "direct_corporate", label: "Direct Corporate" },
  { id: "intermediary", label: "Intermediary / Channel" },
  { id: "other", label: "Other" },
];

export function getInvoicePartyTypeLabel(
  type: InvoicePartyType | string | undefined | null,
): string | undefined {
  if (!type) return undefined;
  return INVOICE_PARTY_TYPE_OPTIONS.find((o) => o.id === type)?.label ?? type;
}

export function isValidInvoicePartyType(value: unknown): value is InvoicePartyType {
  return typeof value === "string" && (INVOICE_PARTY_TYPES as readonly string[]).includes(value);
}

/** Normalize Deal gross-stage / lender-case aliases → PipelineStage. */
export function normalizeInvoicePartyStage(stage: string): PipelineStage {
  const s = stage.trim().toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, PipelineStage> = {
    identified: "pre_login",
    prelogin: "pre_login",
    logged_in_wip: "logged_in",
    login: "logged_in",
    credit: "credit_wip",
    sanction: "soft_approved",
    soft_approval: "soft_approved",
    disbursement: "closure_wip",
    disbursed: "won",
    hold: "pre_login",
    lost: "pre_login",
    won: "won",
  };
  if (aliases[s]) return aliases[s];
  return migrateLegacyStage(s);
}

/**
 * CO-BUG-001 — Always false.
 * Invoice Party must never be treated as required for Deal Workspace, Save, Auto-Save,
 * stage transition, or Lender Pipeline update. Action Center may still show advisory copy.
 */
export function requiresInvoiceParty(_stage?: string | PipelineStage): boolean {
  return false;
}

/**
 * @deprecated CO-DWS-001 / CO-BUG-001 — Pipeline progression must never be blocked by Invoice Party.
 * Always returns false. Use assertInvoicePartyForAccountingOperation for accounting gates.
 */
export function invoicePartyRequiredToProgressTo(_toStage: string | PipelineStage): boolean {
  return false;
}

/** Complete when Accounting Invoice Party Master id is assigned on the Deal. */
export function isInvoicePartyComplete(input: {
  invoicePartyId?: string | null;
  /** @deprecated legacy bridge */
  commissionAccountingPayeeId?: string | null;
}): boolean {
  return Boolean(
    input.invoicePartyId?.trim() || input.commissionAccountingPayeeId?.trim(),
  );
}

/**
 * CO-DWS-001 — Hard gate for accounting workflows only.
 * Call from invoice generation, commission booking, payment entry, accounting posting.
 */
export function assertInvoicePartyForAccountingOperation(input: {
  invoicePartyId?: string | null;
  commissionAccountingPayeeId?: string | null;
}): void {
  if (isInvoicePartyComplete(input)) return;
  throw new Error(INVOICE_PARTY_REQUIRED_MESSAGE);
}

/** @deprecated Use INVOICE_PARTY_TYPES — commercial payee type alias (no intermediary). */
export const LOAN_COMMERCIAL_PAYEE_TYPES = [
  "customer",
  "lender",
  "builder",
  "channel_partner",
  "chartered_accountant",
  "direct_corporate",
  "other",
] as const;

/** @deprecated */
export type LoanCommercialPayeeType = (typeof LOAN_COMMERCIAL_PAYEE_TYPES)[number];

/** @deprecated */
export const LOAN_COMMERCIAL_PAYEE_OPTIONS: ReadonlyArray<{
  id: LoanCommercialPayeeType;
  label: string;
}> = INVOICE_PARTY_TYPE_OPTIONS.filter(
  (o): o is { id: LoanCommercialPayeeType; label: string } =>
    (LOAN_COMMERCIAL_PAYEE_TYPES as readonly string[]).includes(o.id),
);

/** @deprecated */
export function getCommercialPayeeLabel(
  type: LoanCommercialPayeeType | undefined | null,
): string | undefined {
  return getInvoicePartyTypeLabel(type);
}
