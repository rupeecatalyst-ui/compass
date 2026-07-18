/**
 * Seed EDIE document-rule registry from certified packs (keeps legacy rule API in sync).
 */

import {
  listEdieDocumentRules,
  registerEdieDocumentRule,
} from "@/lib/enterprise-document-intelligence-engine";
import type { EdieCustomerCategory, EdieProductRef } from "@/types/edie-certified-rules";
import { resolveEdieCertifiedChecklist } from "./resolve-checklist";

const PRODUCTS: EdieProductRef[] = [
  "product:home-loan",
  "product:home-loan-bt",
  "product:lap",
  "product:unsecured-business-loan",
  "product:personal-loan",
];

const CATEGORIES: EdieCustomerCategory[] = ["salaried", "self_employed", "company"];

/**
 * Ensure EDIE registry has certified product × category rules.
 * Idempotent — skips if certified seed marker present.
 */
export function seedEdieCertifiedRulesIfNeeded() {
  const existing = listEdieDocumentRules();
  if (existing.some((r) => r.ruleCode.startsWith("EDIE-CERT-"))) return;

  for (const productRef of PRODUCTS) {
    for (const customerCategory of CATEGORIES) {
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
        ruleCode: `EDIE-CERT-${productRef.replace("product:", "").toUpperCase()}-${customerCategory.toUpperCase()}`,
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
