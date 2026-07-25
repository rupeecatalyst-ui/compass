/**
 * LOD readiness — mandatory Opportunity fields before Generate LOD.
 */

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
};

function isSelfEmployedFamily(category?: string | null, employment?: string | null): boolean {
  const c = (category || "").toLowerCase();
  const e = (employment || "").toLowerCase();
  return (
    c === "self_employed" ||
    c === "company" ||
    e.includes("self-employed") ||
    e.includes("self employed") ||
    e.includes("business") ||
    e.includes("propriet") ||
    e.includes("partner") ||
    e.includes("llp") ||
    e.includes("private")
  );
}

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
  if (!input.productLabel?.trim()) {
    gaps.push({ field: "product", label: "Product" });
  }
  if (!input.borrowerCategory?.trim() && !input.employmentType?.trim()) {
    gaps.push({ field: "borrowerType", label: "Borrower Type" });
  }
  if (isSelfEmployedFamily(input.borrowerCategory, input.employmentType)) {
    if (!input.constitution?.trim()) {
      gaps.push({ field: "constitution", label: "Business Constitution" });
    }
  }

  const canGenerate = gaps.length === 0;
  return {
    canGenerate,
    gaps,
    chanakyaMessage: canGenerate
      ? null
      : "I cannot generate an accurate List of Documents because some mandatory Opportunity information is missing.\n\nPlease complete the highlighted information before generating the LOD.",
  };
}
