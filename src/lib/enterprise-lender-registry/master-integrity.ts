/**
 * CO-MASTER-001 — Master-data integrity checks for Lender + Product + Program chain.
 * Read-only validation helpers — does not mutate production data.
 */

import type {
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";

export type MasterIntegrityIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  entityId?: string;
};

export function validateLenderProductProgramIntegrity(input: {
  lenders: EnterpriseLenderRecord[];
  programs: EnterpriseLenderProgramRecord[];
  productCodes: string[];
}): MasterIntegrityIssue[] {
  const issues: MasterIntegrityIssue[] = [];
  const productSet = new Set(
    input.productCodes.map((c) => c.trim().toUpperCase()).filter(Boolean),
  );
  const lenderById = new Map(input.lenders.map((l) => [l.id, l]));
  const codes = new Map<string, string>();

  for (const lender of input.lenders) {
    if (lender.isDeleted) continue;
    const supported = (lender.productsSupported ?? []).map((p) => p.trim().toUpperCase());
    for (const code of supported) {
      if (productSet.size > 0 && !productSet.has(code)) {
        issues.push({
          severity: "warning",
          code: "ORPHAN_PRODUCT_SUPPORT",
          message: `Lender ${lender.code} supports product ${code} not found in Product Master.`,
          entityId: lender.id,
        });
      }
    }
  }

  for (const program of input.programs) {
    if (program.isDeleted) continue;
    const lender = lenderById.get(program.lenderId);
    if (!lender || lender.isDeleted) {
      issues.push({
        severity: "error",
        code: "ORPHAN_PROGRAM_LENDER",
        message: `Program ${program.code} references missing/deleted lender.`,
        entityId: program.id,
      });
    } else if (
      lender.status !== "active" ||
      !lender.enabled ||
      lender.lifecycleStatus === "suspended" ||
      lender.lifecycleStatus === "retired"
    ) {
      if (program.enabled && program.status === "active") {
        issues.push({
          severity: "warning",
          code: "PROGRAM_ON_INACTIVE_LENDER",
          message: `Active program ${program.code} references inactive lender ${lender.code}.`,
          entityId: program.id,
        });
      }
    }

    const pc = (program.productCode ?? "").trim().toUpperCase();
    if (pc && productSet.size > 0 && !productSet.has(pc)) {
      issues.push({
        severity: "warning",
        code: "PROGRAM_UNKNOWN_PRODUCT",
        message: `Program ${program.code} productCode ${pc} not in Product Master.`,
        entityId: program.id,
      });
    }

    if (lender && pc) {
      const supported = new Set(
        (lender.productsSupported ?? []).map((p) => p.trim().toUpperCase()),
      );
      if (supported.size > 0 && !supported.has(pc)) {
        issues.push({
          severity: "warning",
          code: "PROGRAM_PRODUCT_NOT_MAPPED",
          message: `Program ${program.code} product ${pc} is not on lender ${lender.code} Supported Products.`,
          entityId: program.id,
        });
      }
    }

    const dupKey = `${program.organizationId}:${program.code}`;
    if (codes.has(dupKey)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_PROGRAM_CODE",
        message: `Duplicate program code ${program.code}.`,
        entityId: program.id,
      });
    } else {
      codes.set(dupKey, program.id);
    }
  }

  return issues;
}
