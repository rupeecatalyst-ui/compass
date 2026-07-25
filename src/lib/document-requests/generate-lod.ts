/**
 * Dynamic LOD generation — three dimensions only:
 * Borrower Type · Loan Product · Business Constitution.
 * Reuses EDIE Certified Checklist SSOT; deduplicates by typeRef.
 * Classification: Critical vs Journey (two categories only).
 */

import { resolveEdieCertifiedChecklist } from "@/lib/edie-certified/resolve-checklist";
import {
  resolveEdieConstitution,
  resolveEdieCustomerCategory,
  resolveEdieProductRef,
  resolveEdieTransactionType,
} from "@/lib/edie-certified/resolve-context";
import type { LoanFile } from "@/types/catalyst-one";
import type { EdieCustomerCategory, EdieResolveInput } from "@/types/edie-certified-rules";
import type { DocumentRequestLodItem } from "@/types/document-requests";

function mapBorrowerCategory(
  employmentType?: string | null,
  explicit?: string | null,
  entityHint?: string | null,
): EdieCustomerCategory {
  if (explicit === "salaried" || explicit === "self_employed" || explicit === "company") {
    return explicit;
  }
  return resolveEdieCustomerCategory(employmentType || undefined, entityHint || undefined);
}

export function generateOpportunityLod(input: {
  productLabel: string;
  employmentType?: string | null;
  borrowerCategory?: string | null;
  constitution?: string | null;
  transactionType?: "fresh" | "balance_transfer" | null;
  /** Optional runtime case for EDIE helpers that expect LoanFile shapes */
  runtimeFile?: LoanFile | null;
}): DocumentRequestLodItem[] {
  const productRef = resolveEdieProductRef(input.productLabel);
  const entityHint =
    input.runtimeFile?.participants?.find((p) => p.entityType === "company")
      ? "company"
      : undefined;
  const customerCategory = mapBorrowerCategory(
    input.employmentType,
    input.borrowerCategory,
    entityHint,
  );

  let constitution = input.constitution?.trim() || undefined;
  let transactionType = input.transactionType ?? "fresh";
  if (input.runtimeFile) {
    constitution = constitution || resolveEdieConstitution(input.runtimeFile);
    transactionType = resolveEdieTransactionType(input.runtimeFile);
  }

  const resolveInput: EdieResolveInput = {
    productRef,
    customerCategory,
    transactionType,
    workflowStage: "before_lender_login",
    constitution,
    receipts: {},
  };

  const checklist = resolveEdieCertifiedChecklist(resolveInput);
  const byRef = new Map<string, DocumentRequestLodItem>();

  for (const item of checklist.items) {
    // Skip unselected choice-group variants (optional duplicates)
    if (item.choiceGroupId && item.optional) continue;
    if (byRef.has(item.typeRef)) continue;

    const category = item.critical || item.mandatory ? "critical" : "journey";
    byRef.set(item.typeRef, {
      typeRef: item.typeRef,
      label: item.label,
      category,
      moduleId: item.moduleId,
      moduleLabel: item.moduleLabel,
      mandatory: item.mandatory,
      critical: item.critical,
    });
  }

  return Array.from(byRef.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category === "critical" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}
