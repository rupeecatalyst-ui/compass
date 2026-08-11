#!/usr/bin/env node
/**
 * CO-UX-021 — static gate: Enterprise Business Notes SSOT wiring.
 * Engineering gate only — does NOT satisfy Business Certification.
 * Deploy remains blocked until Product Owner approval.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) failures.push(`${label ?? rel}: file missing`);
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

function mustNotContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

mustExist("src/types/enterprise-business-notes.ts", "EBN types");
mustExist("src/constants/enterprise-business-notes/index.ts", "EBN constants");
mustExist("src/lib/enterprise-business-notes/index.ts", "EBN lib");
mustExist(
  "server/services/enterprise-business-notes/enterprise-business-notes.service.ts",
  "EBN service",
);
mustExist(
  "server/repositories/enterprise-business-notes/enterprise-business-notes.repository.ts",
  "EBN repo",
);
mustExist("src/app/api/enterprise-business-notes/route.ts", "EBN API");
mustExist(
  "prisma/migrations/20260807190000_co_ux_021_enterprise_business_notes/migration.sql",
  "EBN migration",
);
mustExist(".cursor/rules/enterprise-business-notes.mdc", "EBN rule");
mustExist("docs/co-ux-021/CO-UX-021-ARCHITECTURE-REPORT.md", "architecture");
mustExist("docs/co-ux-021/CO-UX-021-UX-WALKTHROUGH.md", "UX walkthrough");
mustExist("docs/co-ux-021/CO-UX-021-ACTIVITY-TIMELINE-DEMO.md", "timeline demo");
mustExist("docs/co-ux-021/CO-UX-021-BUSINESS-CERTIFICATION-REPORT.md", "biz cert");
mustExist("docs/co-ux-021/CO-UX-021-PRODUCTION-READINESS-REPORT.md", "prod readiness");

mustContain("prisma/schema.prisma", "model EnterpriseBusinessNote", "schema model");
mustContain(
  "prisma/schema.prisma",
  '@@map("enterprise_business_notes")',
  "schema table map",
);

mustContain(
  "server/services/enterprise-business-notes/enterprise-business-notes.service.ts",
  'eventKind: "notes"',
  "EAR dual-write eventKind",
);
mustContain(
  "server/services/enterprise-business-notes/enterprise-business-notes.service.ts",
  "EAR_SOURCE_BUSINESS_NOTES",
  "EAR dual-write source",
);
mustContain(
  "server/services/enterprise-business-notes/enterprise-business-notes.service.ts",
  "softDelete",
  "soft delete path",
);

mustContain(
  "src/components/catalyst-one/enterprise-business-notes/business-notes-action-button.tsx",
  "StickyNote",
  "compact Notes button",
);
mustContain(
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx",
  "BusinessNotesActionButton",
  "OW header Notes",
);
mustContain(
  "src/components/catalyst-one/shared/loan-workspace-modal.tsx",
  "BusinessNotesActionButton",
  "Deal/Lender header Notes",
);
mustContain(
  "src/components/catalyst-one/customers/customer-workspace-sticky-header.tsx",
  "BusinessNotesActionButton",
  "Customer header Notes",
);
mustContain(
  "src/components/catalyst-one/accounting/accounting-workspace.tsx",
  "BusinessNotesActionButton",
  "Accounting header Notes",
);

mustContain(
  "src/components/catalyst-one/opportunity-workspace/workspace-notes-panel.tsx",
  "EnterpriseBusinessNotesPanel",
  "OW Notes panel uses SSOT",
);
mustNotContain(
  "src/components/catalyst-one/opportunity-workspace/workspace-notes-panel.tsx",
  "catalyst.strategic.notes",
  "OW must not use localStorage strategic notes",
);

mustContain(
  "src/lib/enterprise-business-notes/api-client.ts",
  "projectBusinessNotesForAiContext",
  "AI-ready projection helper",
);

if (failures.length) {
  console.error("CO-UX-021 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-UX-021 verify PASSED (engineering gate). Deploy blocked until PO approval.");
