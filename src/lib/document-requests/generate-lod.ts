/**
 * Dynamic LOD generation — three dimensions only:
 * Borrower Type · Loan Product · Business Constitution.
 * Reuses EDIE Certified Checklist SSOT; deduplicates by typeRef.
 * Classification: Critical vs Journey (two categories only).
 *
 * Never silently maps unknown product → Home Loan or unknown employment → Salaried.
 */

import { resolveEdieCertifiedChecklist } from "@/lib/edie-certified/resolve-checklist";
import {
  resolveEdieConstitution,
  resolveEdieTransactionType,
  tryResolveEdieConstitutionKind,
  tryResolveEdieCustomerCategory,
  tryResolveEdieProductRef,
} from "@/lib/edie-certified/resolve-context";
import { evaluateDocumentRequestLodReadiness } from "@/lib/document-requests/lod-readiness";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  EdieCustomerCategory,
  EdieProductRef,
  EdieResolveInput,
  EdieTransactionType,
} from "@/types/edie-certified-rules";
import type {
  DocumentRequestLodItem,
  DocumentRequestLodReadinessGap,
} from "@/types/document-requests";

export class EdieLodCertificationError extends Error {
  readonly gaps: DocumentRequestLodReadinessGap[];

  constructor(message: string, gaps: DocumentRequestLodReadinessGap[]) {
    super(message);
    this.name = "EdieLodCertificationError";
    this.gaps = gaps;
  }
}

export type GenerateOpportunityLodInput = {
  productLabel: string;
  employmentType?: string | null;
  borrowerCategory?: string | null;
  constitution?: string | null;
  transactionType?: "fresh" | "balance_transfer" | null;
  /** Optional runtime case for EDIE helpers that expect LoanFile shapes */
  runtimeFile?: LoanFile | null;
};

function assertCertifiedLodContext(input: GenerateOpportunityLodInput): {
  productRef: EdieProductRef;
  customerCategory: EdieCustomerCategory;
  constitution?: string;
  transactionType: EdieTransactionType;
} {
  const entityHint =
    input.runtimeFile?.participants?.find((p) => p.entityType === "company")
      ? "company"
      : undefined;

  let constitution = input.constitution?.trim() || undefined;
  let transactionType: EdieTransactionType = input.transactionType ?? "fresh";
  if (input.runtimeFile) {
    constitution = constitution || resolveEdieConstitution(input.runtimeFile);
    transactionType = resolveEdieTransactionType(input.runtimeFile);
  }

  const gate = evaluateDocumentRequestLodReadiness({
    // Contact fields already gated in UI; placeholders isolate EDIE axis failures here.
    customerName: "validated",
    mobile: "validated",
    email: "validated",
    productLabel: input.productLabel,
    employmentType: input.employmentType,
    borrowerCategory: input.borrowerCategory,
    constitution,
    entityHint,
  });

  const product = tryResolveEdieProductRef(input.productLabel);
  const category = tryResolveEdieCustomerCategory(
    input.employmentType,
    entityHint,
    input.borrowerCategory,
  );

  if (!product.ok || !category.ok || !gate.canGenerate) {
    const message =
      gate.chanakyaMessage ||
      (!product.ok
        ? product.message
        : !category.ok
          ? category.message
          : "EDIE certified checklist validation failed. LOD was not generated.");
    throw new EdieLodCertificationError(message, gate.gaps);
  }

  if (category.customerCategory === "self_employed" || category.customerCategory === "company") {
    const constitutionKind = tryResolveEdieConstitutionKind(constitution);
    if (!constitutionKind.ok) {
      throw new EdieLodCertificationError(constitutionKind.message, [
        {
          field: "edie.constitution",
          label: "Certified Business Constitution (EDIE)",
          detail: constitutionKind.message,
        },
      ]);
    }
  }

  return {
    productRef: product.productRef,
    customerCategory: category.customerCategory,
    constitution,
    transactionType,
  };
}

export function generateOpportunityLod(input: GenerateOpportunityLodInput): DocumentRequestLodItem[] {
  const resolved = assertCertifiedLodContext(input);

  const resolveInput: EdieResolveInput = {
    productRef: resolved.productRef,
    customerCategory: resolved.customerCategory,
    transactionType: resolved.transactionType,
    workflowStage: "before_lender_login",
    constitution: resolved.constitution,
    receipts: {},
  };

  const checklist = resolveEdieCertifiedChecklist(resolveInput);
  const byRef = new Map<string, DocumentRequestLodItem>();

  for (const item of checklist.items) {
    // Skip unselected choice-group variants (optional duplicates)
    if (item.choiceGroupId && item.optional) continue;
    if (byRef.has(item.typeRef)) continue;

    const lodCategory = item.critical || item.mandatory ? "critical" : "journey";
    byRef.set(item.typeRef, {
      typeRef: item.typeRef,
      label: item.label,
      category: lodCategory,
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
