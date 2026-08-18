#!/usr/bin/env node
/**
 * CO-C1-ACCOUNTING-ACTIVATION-001 — Accounting certification baseline activation gate.
 * Engineering gate only — does NOT grant Business Certification.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!existsSync(join(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

mustExist("src/app/(dashboard)/accounting/page.tsx");
mustExist("src/components/catalyst-one/accounting/accounting-workspace.tsx");
mustExist("src/lib/accounting-workspace/resolve-workbench.ts");
mustExist("src/components/catalyst-one/accounting/invoice-party-master-workbench.tsx");
mustExist("src/app/api/invoice-parties/route.ts");

mustContain("src/constants/routes.ts", 'ACCOUNTING: "/accounting"', "route constant");
mustContain("src/config/navigation.ts", 'title: "Accounting"', "primary nav");
mustContain("src/config/navigation.ts", 'badge: "Awaiting SSOT"', "honest SSOT badge");
mustContain(
  "src/components/catalyst-one/accounting/accounting-workspace.tsx",
  "resolveAccountingWorkbenchFromSearchParams",
  "deep-link activation",
);
mustContain(
  "src/lib/accounting-workspace/resolve-workbench.ts",
  "buildAccountingWorkbenchHref",
  "certification href helper",
);
mustContain(
  "src/lib/accounting-workspace/mock-data.ts",
  "ACCOUNTING_SSOT_PENDING_MESSAGE",
  "empty-honest ledger posture",
);

// Workbench surfaces remain present
for (const id of [
  "dashboard",
  "invoices",
  "receivables",
  "payouts",
  "collections",
  "gst_tax",
  "invoice_party_master",
  "reports",
  "notes",
]) {
  mustContain("src/constants/accounting-workbench.ts", `"${id}"`, `workbench ${id}`);
}

// Live Invoice Party path (prisma-gated)
mustContain(
  "src/app/api/invoice-parties/route.ts",
  "ENTERPRISE_PERSISTENCE_MODE=prisma",
  "Invoice Party persistence gate",
);

// Marketing / Deal architecture untouched markers (sanity)
mustContain(
  "src/constants/enterprise-marketing-engine/safety.ts",
  "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false",
  "marketing execution remains OFF",
);

if (failures.length) {
  console.error("CO-C1-ACCOUNTING-ACTIVATION-001 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-C1-ACCOUNTING-ACTIVATION-001 VERIFY PASS");
console.log(" route: /accounting");
console.log(" deep-links: ?workbench= | ?tab= | ?action=");
console.log(" live subset: Invoice Party Master (prisma)");
console.log(" ledger SSOT: awaiting (empty-honest)");
