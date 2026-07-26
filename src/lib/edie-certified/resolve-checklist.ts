/**
 * EDIE Certified Checklist Resolver — single SSOT for Document Center.
 */

import {
  applyStageSeverity,
  groupItemsByModule,
  moduleAddressProof,
  moduleAssetSecurityMinimal,
  moduleBanking,
  moduleBusinessConstitution,
  moduleCustomerKyc,
  moduleExistingLoan,
  moduleFinancial,
  moduleProperty,
} from "@/constants/edie-certified/modules";
import {
  EDIE_ADDRESS_PROOF_GROUP,
  EDIE_IDENTITY_PROOF_GROUP,
} from "@/constants/edie-certified/document-catalog";
import { resolveEdieProductFamily } from "@/constants/edie-certified/product-families";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  EdieChecklistItem,
  EdieComplianceGateResult,
  EdieResolveInput,
  EdieResolvedChecklist,
} from "@/types/edie-certified-rules";
import {
  resolveEdieConstitution,
  resolveEdieCustomerCategory,
  resolveEdieProductRef,
  resolveEdieTransactionType,
  resolveEdieWorkflowStage,
} from "./resolve-context";

const ADDRESS_KEY = "catalyst.document-center.address-proof";
const IDENTITY_KEY = "catalyst.document-center.identity-proof";
const CHOICE_KEY = "catalyst.document-center.choice-selection";
const RECEIPT_KEY = "catalyst.document-center.receipts";

export function loadEdieReceipts(fileId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${RECEIPT_KEY}:${fileId}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveEdieReceipts(fileId: string, map: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${RECEIPT_KEY}:${fileId}`, JSON.stringify(map));
}

export function loadAddressProofSelection(fileId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return (
      localStorage.getItem(`${ADDRESS_KEY}:${fileId}`) ??
      loadChoiceGroupSelection(fileId, EDIE_ADDRESS_PROOF_GROUP)
    );
  } catch {
    return undefined;
  }
}

export function saveAddressProofSelection(fileId: string, typeRef: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${ADDRESS_KEY}:${fileId}`, typeRef);
  saveChoiceGroupSelection(fileId, EDIE_ADDRESS_PROOF_GROUP, typeRef);
}

export function loadIdentityProofSelection(fileId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return (
      localStorage.getItem(`${IDENTITY_KEY}:${fileId}`) ??
      loadChoiceGroupSelection(fileId, EDIE_IDENTITY_PROOF_GROUP)
    );
  } catch {
    return undefined;
  }
}

export function saveIdentityProofSelection(fileId: string, typeRef: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${IDENTITY_KEY}:${fileId}`, typeRef);
  saveChoiceGroupSelection(fileId, EDIE_IDENTITY_PROOF_GROUP, typeRef);
}

export function loadChoiceGroupSelection(
  fileId: string,
  choiceGroupId: string,
): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`${CHOICE_KEY}:${fileId}`);
    if (!raw) return undefined;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[choiceGroupId];
  } catch {
    return undefined;
  }
}

export function saveChoiceGroupSelection(
  fileId: string,
  choiceGroupId: string,
  typeRef: string,
) {
  if (typeof window === "undefined") return;
  let map: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(`${CHOICE_KEY}:${fileId}`);
    if (raw) map = JSON.parse(raw) as Record<string, string>;
  } catch {
    map = {};
  }
  map[choiceGroupId] = typeRef;
  localStorage.setItem(`${CHOICE_KEY}:${fileId}`, JSON.stringify(map));
  if (choiceGroupId === EDIE_ADDRESS_PROOF_GROUP) {
    localStorage.setItem(`${ADDRESS_KEY}:${fileId}`, typeRef);
  }
  if (choiceGroupId === EDIE_IDENTITY_PROOF_GROUP) {
    localStorage.setItem(`${IDENTITY_KEY}:${fileId}`, typeRef);
  }
}

function markComplete(
  items: EdieChecklistItem[],
  receipts: Record<string, boolean>,
  fileDocs?: LoanFile["documents"],
): EdieChecklistItem[] {
  return items.map((item) => {
    let complete = Boolean(receipts[item.typeRef]);
    if (!complete && item.folderId && receipts[item.folderId]) complete = true;
    if (!complete && fileDocs?.length) {
      const labelWord = item.label.toLowerCase().split(" ")[0]!;
      const hit = fileDocs.find((d) => d.name.toLowerCase().includes(labelWord));
      if (hit) {
        complete =
          hit.status === "received" ||
          hit.status === "verified" ||
          hit.status === "pending";
      }
    }
    return { ...item, complete };
  });
}

/** Apply choice_one selections — only the selected type is mandatory for scoring. */
function applyChoiceGroupSelections(
  items: EdieChecklistItem[],
  selections: Record<string, string | undefined>,
): EdieChecklistItem[] {
  const groupIds = [
    ...new Set(
      items.map((i) => i.choiceGroupId).filter((id): id is string => Boolean(id)),
    ),
  ];
  let next = items;
  for (const groupId of groupIds) {
    const selected =
      selections[groupId] ||
      next.find((i) => i.choiceGroupId === groupId && !i.optional)?.typeRef ||
      next.find((i) => i.choiceGroupId === groupId)?.typeRef;
    next = next.map((i) => {
      if (i.choiceGroupId !== groupId) return i;
      const isSelected = i.typeRef === selected;
      return {
        ...i,
        optional: !isSelected,
        mandatory: isSelected,
        severity: isSelected ? (i.critical ? "critical" : "mandatory") : "required",
        critical: isSelected ? i.critical : false,
      };
    });
  }
  return next;
}

function isScoringItem(item: EdieChecklistItem): boolean {
  if (item.choiceGroupId && item.optional) return false;
  return true;
}

function composeCreditAssessmentItems(input: EdieResolveInput): EdieChecklistItem[] {
  const {
    productRef,
    customerCategory,
    transactionType,
    workflowStage,
    constitution,
    addressProofSelection,
    identityProofSelection,
  } = input;

  return [
    ...moduleCustomerKyc(identityProofSelection),
    ...moduleAddressProof(addressProofSelection),
    ...(customerCategory === "self_employed" || customerCategory === "company"
      ? moduleBusinessConstitution(constitution)
      : []),
    ...moduleFinancial(customerCategory),
    ...moduleBanking(),
    ...moduleProperty(productRef, workflowStage),
    ...moduleExistingLoan(transactionType, productRef),
  ];
}

/**
 * Resolve dynamic checklist from certified modules — never hardcoded in UI.
 */
export function resolveEdieCertifiedChecklist(input: EdieResolveInput): EdieResolvedChecklist {
  const {
    productRef,
    customerCategory,
    transactionType,
    workflowStage,
    constitution,
    receipts = {},
    addressProofSelection,
    identityProofSelection,
  } = input;

  const productFamily = resolveEdieProductFamily(productRef);

  let items: EdieChecklistItem[] =
    productFamily === "asset_security"
      ? moduleAssetSecurityMinimal(addressProofSelection, identityProofSelection)
      : composeCreditAssessmentItems(input);

  items = items.map((i) => applyStageSeverity(i, workflowStage));

  items = applyChoiceGroupSelections(items, {
    [EDIE_ADDRESS_PROOF_GROUP]: addressProofSelection,
    [EDIE_IDENTITY_PROOF_GROUP]: identityProofSelection,
  });

  items = markComplete(items, receipts);

  const scoringItems = items.filter(isScoringItem);

  const modules = groupItemsByModule(items);
  const pending = scoringItems.filter((i) => !i.complete);
  const criticalPending = scoringItems.filter((i) => i.critical && !i.complete);

  return {
    productRef,
    productFamily,
    customerCategory,
    transactionType,
    workflowStage,
    constitution,
    modules,
    items,
    counts: {
      required: scoringItems.filter((i) => i.severity === "required" || i.optional).length,
      mandatory: scoringItems.filter((i) => i.mandatory).length,
      critical: scoringItems.filter((i) => i.critical).length,
      received: scoringItems.filter((i) => i.complete).length,
      pending: pending.length,
      criticalPending: criticalPending.length,
    },
  };
}

/** Resolve checklist directly from a loan file. */
export function resolveEdieChecklistForLoanFile(
  file: LoanFile,
  options?: {
    receipts?: Record<string, boolean>;
    addressProofSelection?: string;
    identityProofSelection?: string;
  },
): EdieResolvedChecklist {
  const productRef = resolveEdieProductRef(file.loanProduct);
  const customerCategory = resolveEdieCustomerCategory(
    file.employmentType,
    file.participants?.find((p) => p.entityType === "company") ? "company" : undefined,
  );
  const receipts = options?.receipts ?? loadEdieReceipts(file.id);
  const addressProofSelection =
    options?.addressProofSelection ?? loadAddressProofSelection(file.id);
  const identityProofSelection =
    options?.identityProofSelection ?? loadIdentityProofSelection(file.id);

  const merged = { ...receipts };
  for (const d of file.documents ?? []) {
    const n = d.name.toLowerCase();
    if (
      (n.includes("financial") || n.includes("itr") || n.includes("gst") || n.includes("balance")) &&
      (d.status === "received" || d.status === "verified" || d.status === "pending")
    ) {
      merged["doc:financial-folder"] = true;
      merged["doc:itr-optional"] = true;
    }
    if (
      (n.includes("property") || n.includes("sale deed") || n.includes("title")) &&
      (d.status === "received" || d.status === "verified" || d.status === "pending")
    ) {
      merged["doc:property-folder"] = true;
    }
  }

  const checklist = resolveEdieCertifiedChecklist({
    productRef,
    customerCategory,
    transactionType: resolveEdieTransactionType(file),
    workflowStage: resolveEdieWorkflowStage(file),
    constitution: resolveEdieConstitution(file),
    receipts: merged,
    addressProofSelection,
    identityProofSelection,
  });

  checklist.items = markComplete(checklist.items, merged, file.documents);
  checklist.modules = groupItemsByModule(checklist.items);
  const scoringItems = checklist.items.filter(isScoringItem);
  checklist.counts = {
    required: scoringItems.filter((i) => i.optional).length,
    mandatory: scoringItems.filter((i) => i.mandatory).length,
    critical: scoringItems.filter((i) => i.critical).length,
    received: scoringItems.filter((i) => i.complete).length,
    pending: scoringItems.filter((i) => !i.complete).length,
    criticalPending: scoringItems.filter((i) => i.critical && !i.complete).length,
  };
  return checklist;
}

export function evaluateEdieComplianceGate(
  file: LoanFile,
): EdieComplianceGateResult {
  const checklist = resolveEdieChecklistForLoanFile(file);
  const missingMandatory = checklist.items.filter(
    (i) => i.mandatory && !i.complete && isScoringItem(i),
  );
  return {
    allowed: missingMandatory.length === 0,
    missingMandatory,
    summary:
      missingMandatory.length === 0
        ? "All mandatory documents received."
        : `${missingMandatory.length} mandatory document(s) pending.`,
  };
}

export function listEdieCriticalPending(file: LoanFile): EdieChecklistItem[] {
  const checklist = resolveEdieChecklistForLoanFile(file);
  return checklist.items.filter((i) => i.critical && !i.complete && isScoringItem(i));
}
