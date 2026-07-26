/**
 * LOD readiness — mandatory Opportunity fields + EDIE certified checklist gate.
 * Never allow Generate LOD when product / borrower type would silently fall back.
 */

import {
  tryResolveEdieConstitutionKind,
  tryResolveEdieCustomerCategory,
  tryResolveEdieProductRef,
} from "@/lib/edie-certified/resolve-context";
import type {
  DocumentRequestLodReadiness,
  DocumentRequestLodReadinessGap,
} from "@/types/document-requests";

export type DocumentRequestContextInput = {
  customerName?: string | null;
  mobile?: string | null;
  email?: string | null;
  productLabel?: string | null;
  /** salaried | self_employed | company — from employment */
  borrowerCategory?: string | null;
  employmentType?: string | null;
  constitution?: string | null;
  /** Optional entity hint (e.g. company participant) */
  entityHint?: string | null;
};

function requiresConstitution(category: "salaried" | "self_employed" | "company"): boolean {
  return category === "self_employed" || category === "company";
}

function buildChanakyaMessage(gaps: DocumentRequestLodReadinessGap[]): string {
  const edieGaps = gaps.filter((g) => g.field.startsWith("edie."));
  const fieldGaps = gaps.filter((g) => !g.field.startsWith("edie."));

  const parts: string[] = [];
  if (fieldGaps.length) {
    parts.push(
      "I cannot generate an accurate List of Documents because some mandatory Opportunity information is missing.",
      "",
      `Please complete: ${fieldGaps.map((g) => g.label).join(", ")}.`,
    );
  }
  if (edieGaps.length) {
    if (parts.length) parts.push("");
    parts.push(
      "EDIE does not have a certified document checklist for the selected combination.",
      "LOD will not be generated using a different product or borrower type.",
      "",
      ...edieGaps.map((g) => g.detail || g.label),
    );
  }
  return parts.join("\n");
}

/**
 * Validate Opportunity context for LOD — field completeness + EDIE certification.
 */
export function evaluateDocumentRequestLodReadiness(
  input: DocumentRequestContextInput,
): DocumentRequestLodReadiness {
  const gaps: DocumentRequestLodReadinessGap[] = [];

  if (!input.customerName?.trim()) {
    gaps.push({ field: "customerName", label: "Customer Name" });
  }
  if (!input.mobile?.trim()) {
    gaps.push({ field: "mobile", label: "Mobile Number" });
  }
  if (!input.email?.trim()) {
    gaps.push({ field: "email", label: "Email Address" });
  }

  const product = tryResolveEdieProductRef(input.productLabel);
  if (!product.ok) {
    gaps.push({
      field: product.code === "missing" ? "product" : "edie.product",
      label: product.code === "missing" ? "Product" : "Certified Product (EDIE)",
      detail: product.message,
    });
  }

  const category = tryResolveEdieCustomerCategory(
    input.employmentType,
    input.entityHint,
    input.borrowerCategory,
  );
  if (!category.ok) {
    gaps.push({
      field: category.code === "missing" ? "borrowerType" : "edie.borrowerType",
      label:
        category.code === "missing" ? "Borrower Type" : "Certified Borrower Type (EDIE)",
      detail: category.message,
    });
  } else if (requiresConstitution(category.customerCategory)) {
    const constitution = tryResolveEdieConstitutionKind(input.constitution);
    if (!constitution.ok) {
      gaps.push({
        field: constitution.code === "missing" ? "constitution" : "edie.constitution",
        label:
          constitution.code === "missing"
            ? "Business Constitution"
            : "Certified Business Constitution (EDIE)",
        detail: constitution.message,
      });
    }
  }

  const canGenerate = gaps.length === 0;
  return {
    canGenerate,
    gaps,
    chanakyaMessage: canGenerate ? null : buildChanakyaMessage(gaps),
  };
}
