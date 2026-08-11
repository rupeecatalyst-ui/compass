#!/usr/bin/env node
/**
 * CO-ORG-008 — Final Enterprise Production Readiness pack gate.
 * Engineering only — not Business Certification / not deploy authority.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel, label) {
  if (!existsSync(join(root, rel))) failures.push(`${label ?? rel}: missing`);
}

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  if (!readFileSync(abs, "utf8").includes(needle)) {
    failures.push(`${label ?? rel}: expected "${needle}"`);
  }
}

mustExist("docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md", "readiness report");
mustExist("docs/co-org-008/CO-ORG-008-FINDING-CLASSIFICATION.md", "classification");
mustExist("docs/co-org-008/CO-ORG-008-BUSINESS-CERTIFICATION-REPORT.md", "biz cert");

mustContain(
  "docs/co-org-008/CO-ORG-008-FINDING-CLASSIFICATION.md",
  "Production Blockers",
  "blockers section",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-FINDING-CLASSIFICATION.md",
  "Go Live Required",
  "go-live section",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-FINDING-CLASSIFICATION.md",
  "Phase 2",
  "phase 2 section",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-FINDING-CLASSIFICATION.md",
  "Future Enhancements",
  "future section",
);

mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "Executive Summary",
  "exec summary",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "Architecture Status",
  "architecture status",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "Business Status",
  "business status",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "Technical Status",
  "technical status",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "Remaining Production Blockers",
  "remaining blockers",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "Readiness Percentage",
  "readiness %",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "Business Certification",
  "biz cert section",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "Deployment Recommendation",
  "deploy recommendation",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "DO NOT DEPLOY",
  "do not deploy",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-PRODUCTION-READINESS-REPORT.md",
  "58%",
  "full readiness %",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-BUSINESS-CERTIFICATION-REPORT.md",
  "Not Business Certified",
  "honest cert verdict",
);
mustContain(
  "docs/co-org-008/CO-ORG-008-BUSINESS-CERTIFICATION-REPORT.md",
  "Product Owner approval",
  "PO gate",
);

// Prior packs still present
mustExist("docs/co-org-006/CO-ORG-006-BUSINESS-CERTIFICATION-REPORT.md", "CO-ORG-006");
mustExist("docs/co-org-007/CO-ORG-007-NAVIGATION-CERTIFICATION-REPORT.md", "CO-ORG-007");
mustExist("docs/co-org-004/CO-ORG-004-REMAINING-GAPS.md", "CO-ORG-004 gaps");

if (failures.length) {
  console.error("CO-ORG-008 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  "CO-ORG-008 verify PASS (engineering gate — DO NOT DEPLOY without Product Owner approval)",
);
