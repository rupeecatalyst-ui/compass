/**
 * Intelligent Payee Capture — single disbursement recipient per loan.
 * UI enforces Individual XOR Company; no backend mutual-exclusivity check required.
 */

import { createParticipantId, syncParticipantLegacyFields } from "@/lib/loan-participants";
import { syncLoanStructureRelationships } from "@/lib/loan-structure/sync-relationships";
import type { LoanFile } from "@/types/catalyst-one";
import type { LoanParticipant } from "@/types/loan-participant";

export type PayeeEntityType = "individual" | "company";

export type PayeeRelationshipHint =
  | "payee"
  | "builder"
  | "seller"
  | "existing_lender"
  | "company_payee";

export interface PayeeSelection {
  entityType: PayeeEntityType;
  entityId: string;
  name: string;
  relationshipCode?: PayeeRelationshipHint;
  mobile?: string;
  email?: string;
  constitution?: string;
}

const PROMPT_SESSION_KEY = "catalyst-one:payee-prompt-shown";

function readPromptShown(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(PROMPT_SESSION_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writePromptShown(map: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PROMPT_SESSION_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function isPayeeCaptured(file: Pick<LoanFile, "payeeEntityId" | "payeeStatus">): boolean {
  return Boolean(file.payeeEntityId) && file.payeeStatus === "captured";
}

export function isPayeePending(file: Pick<LoanFile, "payeeEntityId" | "payeeStatus">): boolean {
  return !isPayeeCaptured(file);
}

/** True when Chanakya should offer the guided popup (not deferred, not captured). */
export function shouldOfferPayeePrompt(
  file: Pick<LoanFile, "id" | "payeeEntityId" | "payeeStatus">,
): boolean {
  if (isPayeeCaptured(file)) return false;
  if (file.payeeStatus !== "pending") return false;
  const shown = readPromptShown();
  return !shown[file.id];
}

export function markPayeePromptShown(fileId: string) {
  const map = readPromptShown();
  map[fileId] = true;
  writePromptShown(map);
}

/** Soft reminder path — ticker only, no repeated popups. */
export function deferPayeeCapture(file: LoanFile): Partial<LoanFile> {
  markPayeePromptShown(file.id);
  return {
    payeeStatus: "deferred",
  };
}

/**
 * Apply exactly one Payee to the loan file, sync Loan Structure participants + ERW links.
 */
export function applyPayeeSelection(
  file: LoanFile,
  selection: PayeeSelection,
): Partial<LoanFile> {
  const now = new Date().toISOString();
  const withoutPriorPayee = (file.participants ?? []).filter((p) => p.role !== "payee");

  const payeeParticipant: LoanParticipant = {
    id: createParticipantId(),
    entityType: selection.entityType,
    entityId: selection.entityId,
    name: selection.name,
    mobile: selection.mobile,
    email: selection.email,
    constitution: selection.constitution,
    role: "payee",
    relationship: selection.relationshipCode ?? "payee",
    status: "active",
  };

  const nextParticipants = [...withoutPriorPayee, payeeParticipant];
  const synced = syncParticipantLegacyFields(nextParticipants, file.businessDetails);

  const patch: Partial<LoanFile> = {
    ...synced,
    payeeEntityType: selection.entityType,
    payeeEntityId: selection.entityId,
    payeeName: selection.name,
    payeeStatus: "captured",
    payeeCapturedAt: now,
    payeeRelationshipCode: selection.relationshipCode ?? "payee",
  };

  const nextFile = { ...file, ...patch };
  syncLoanStructureRelationships(nextFile, synced.participants);
  markPayeePromptShown(file.id);
  return patch;
}

export function payeeReadinessLabel(
  file: Pick<LoanFile, "payeeEntityId" | "payeeName" | "payeeStatus" | "payeeEntityType">,
): { complete: boolean; label: string } {
  if (isPayeeCaptured(file)) {
    return {
      complete: true,
      label: file.payeeName
        ? `Payee · ${file.payeeName}${file.payeeEntityType === "company" ? " (Company)" : ""}`
        : "Payee captured",
    };
  }
  if (file.payeeStatus === "deferred") {
    return { complete: false, label: "Payee deferred — pending" };
  }
  return { complete: false, label: "Payee pending" };
}
