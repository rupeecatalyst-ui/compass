/**
 * Seed EDIE document-rule registry from certified packs (keeps legacy rule API in sync).
 */

import {
  listEdieDocumentRules,
  registerEdieDocumentRule,
} from "@/lib/enterprise-document-intelligence-engine";
import { EDIE_PHASE1_PRODUCTS } from "@/constants/edie-certified/product-families";
import type { EdieCustomerCategory } from "@/types/edie-certified-rules";
import { resolveEdieCertifiedChecklist } from "./resolve-checklist";

const CATEGORIES: EdieCustomerCategory[] = ["salaried", "self_employed", "company"];

const SEED_VERSION = "EDIE-CERT-V2";

/**
 * Ensure EDIE registry has certified product × category rules for all Phase 1 products.
 * Idempotent — skips when V2 seed marker is present.
 */
export function seedEdieCertifiedRulesIfNeeded() {
  const existing = listEdieDocumentRules();
  if (existing.some((r) => r.ruleCode.startsWith(SEED_VERSION))) return;

  for (const productRef of EDIE_PHASE1_PRODUCTS) {
    for (const customerCategory of CATEGORIES) {
      // Asset/security packs are category-agnostic; still seed once per category for registry completeness
      const checklist = resolveEdieCertifiedChecklist({
        productRef,
        customerCategory,
        transactionType: productRef === "product:home-loan-bt" ? "balance_transfer" : "fresh",
        workflowStage: "soft_approval",
        constitution:
          customerCategory === "company" ? "Private Limited Company" : "Proprietorship",
      });
      const typeRefs = [
        ...new Set(
          checklist.items
            .filter((i) => !i.optional || i.moduleId === "customer_kyc")
            .map((i) => i.typeRef),
        ),
      ];
      registerEdieDocumentRule({
        ruleCode: `${SEED_VERSION}-${productRef.replace("product:", "").toUpperCase()}-${customerCategory.toUpperCase()}`,
        ruleName: `Certified ${productRef} · ${customerCategory}`,
        productRef,
        employmentType: customerCategory === "company" ? "company" : customerCategory,
        constitution: customerCategory === "company" ? "company" : "individual",
        customerCategory: "standard",
        loanStage: "origination",
        documentTypeRefs: typeRefs,
        uploadMethod: checklist.items.some((i) => i.uploadMode === "folder") ? "both" : "individual",
        enabled: true,
        createdBy: "system",
      });
    }
  }
}
