#!/usr/bin/env node
/**
 * CO-ORG-006 — static gate: Enterprise Business Certification pack presence.
 * Engineering gate only — does NOT satisfy CO-QA-001 Business Certification.
 * Deploy remains blocked / skipped per Product Owner instruction.
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

mustExist("docs/co-org-006/CO-ORG-006-BUSINESS-CERTIFICATION-REPORT.md", "biz cert report");
mustExist("docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md", "journey inventory");
mustExist("docs/co-org-006/CO-ORG-006-CAPABILITY-SCORECARD.md", "capability scorecard");
mustExist("docs/co-org-006/CO-ORG-006-E2E-SCENARIO.md", "E2E scenario");
mustExist("docs/co-org-006/CO-ORG-006-REMAINING-GAPS.md", "remaining gaps");

mustContain(
  "docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md",
  "Customer",
  "journey includes Customer",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md",
  "Opportunity Workspace",
  "journey includes OW",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md",
  "Lender Pipeline",
  "journey includes Lender Pipeline",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md",
  "Disbursement",
  "journey includes Disbursement",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md",
  "Accounting",
  "journey includes Accounting",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md",
  "CHANAKYA",
  "journey includes CHANAKYA",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md",
  "Mission Control",
  "journey includes Mission Control",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-JOURNEY-INVENTORY.md",
  "BLOCKED",
  "Accounting blocked called out",
);

mustContain(
  "docs/co-org-006/CO-ORG-006-CAPABILITY-SCORECARD.md",
  "Activity",
  "capability Activity",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-CAPABILITY-SCORECARD.md",
  "Documents",
  "capability Documents",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-CAPABILITY-SCORECARD.md",
  "Dialogue",
  "capability Dialogue",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-CAPABILITY-SCORECARD.md",
  "Tasks",
  "capability Tasks",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-CAPABILITY-SCORECARD.md",
  "Timeline",
  "capability Timeline",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-CAPABILITY-SCORECARD.md",
  "Audit",
  "capability Audit",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-CAPABILITY-SCORECARD.md",
  "Enterprise AI",
  "capability Enterprise AI",
);

mustContain(
  "docs/co-org-006/CO-ORG-006-E2E-SCENARIO.md",
  "CO-ORG-006-E2E-001",
  "scenario id",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-E2E-SCENARIO.md",
  "Not executed",
  "live BAT not falsely claimed",
);

mustContain(
  "docs/co-org-006/CO-ORG-006-BUSINESS-CERTIFICATION-REPORT.md",
  "Not Business Certified",
  "honest certification verdict",
);
mustContain(
  "docs/co-org-006/CO-ORG-006-BUSINESS-CERTIFICATION-REPORT.md",
  "no deployment",
  "deploy skipped",
);

/** Journey SSOT still present */
mustContain("src/config/navigation.ts", "Contacts", "nav Contacts");
mustContain("src/config/navigation.ts", "My Opportunities", "nav Opportunities");
mustContain("src/config/navigation.ts", "Accounting", "nav Accounting");
mustContain("src/config/navigation.ts", "Mission Control", "nav Mission Control");
mustContain(
  "src/lib/accounting-workspace/mock-data.ts",
  "ACCOUNTING_SSOT_PENDING_MESSAGE",
  "Accounting SSOT pending honesty",
);

if (failures.length) {
  console.error("CO-ORG-006 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  "CO-ORG-006 verify PASS (engineering gate — not Business Certification; no deploy)",
);
