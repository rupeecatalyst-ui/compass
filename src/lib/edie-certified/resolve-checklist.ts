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
import { EDIE_ADDRESS_PROOF_GROUP } from "@/constants/edie-certified/document-catalog";
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
    return localStorage.getItem(`${ADDRESS_KEY}:${fileId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveAddressProofSelection(fileId: string, typeRef: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${ADDRESS_KEY}:${fileId}`, typeRef);
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

function composeCreditAssessmentItems(input: EdieResolveInput): EdieChecklistItem[] {
  const {
    productRef,
    customerCategory,
    transactionType,
    workflowStage,
    constitution,
    addressProofSelection,
  } = input;

  return [
    ...moduleCustomerKyc(),
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
  } = input;

  const productFamily = resolveEdieProductFamily(productRef);

  let items: EdieChecklistItem[] =
    productFamily === "asset_security"
      ? moduleAssetSecurityMinimal(addressProofSelection)
      : composeCreditAssessmentItems(input);

  items = items.map((i) => applyStageSeverity(i, workflowStage));

  if (productFamily === "credit_assessment") {
    const selectedAddress =
      addressProofSelection ||
      items.find((i) => i.choiceGroupId === EDIE_ADDRESS_PROOF_GROUP && !i.optional)?.typeRef;

    items = items.map((i) => {
      if (i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP) return i;
      const isSelected = i.typeRef === selectedAddress;
      return {
        ...i,
        optional: !isSelected,
        mandatory: isSelected,
        severity: isSelected ? (i.critical ? "critical" : "mandatory") : "required",
        critical: isSelected ? i.critical : false,
      };
    });
  }

  items = markComplete(items, receipts);

  const scoringItems = items.filter(
    (i) => i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP || !i.optional,
  );

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
  });

  checklist.items = markComplete(checklist.items, merged, file.documents);
  checklist.modules = groupItemsByModule(checklist.items);
  const scoringItems = checklist.items.filter(
    (i) => i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP || !i.optional,
  );
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

/** Mandatory compliance gate — only for Disbursed → Accounting / Invoicing. */
export function evaluateEdieComplianceGate(file: LoanFile): EdieComplianceGateResult {
  const checklist = resolveEdieChecklistForLoanFile(file, {
    receipts: loadEdieReceipts(file.id),
  });
  const scoringItems = checklist.items.filter(
    (i) => i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP || !i.optional,
  );
  const missingMandatory = scoringItems.filter((i) => i.mandatory && !i.complete);
  return {
    allowed: missingMandatory.length === 0,
    missingMandatory,
    summary:
      missingMandatory.length === 0
        ? "All mandatory documents are complete. Accounting / invoicing may proceed."
        : `Before moving to Invoicing / Accounting, ${missingMandatory.length} mandatory document(s) remain pending.`,
  };
}

/** Critical pending items for CHANAKYA stage-aware reminders. */
export function listEdieCriticalPending(file: LoanFile): EdieChecklistItem[] {
  const checklist = resolveEdieChecklistForLoanFile(file);
  return checklist.items.filter(
    (i) => i.critical && !i.complete && (i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP || !i.optional),
  );
}
