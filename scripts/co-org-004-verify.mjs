#!/usr/bin/env node
/**
 * CO-ORG-004 — static gate: mock/placeholder quarantine for production readiness.
 * Engineering gate only — does NOT satisfy Business Certification.
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

function mustNotContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

mustExist("docs/co-org-004/CO-ORG-004-PRODUCTION-READINESS-REPORT.md");

// Accounting — no invented revenue
mustContain(
  "src/lib/accounting-workspace/mock-data.ts",
  "ACCOUNTING_SSOT_PENDING_MESSAGE",
  "accounting empty model",
);
mustNotContain(
  "src/lib/accounting-workspace/mock-data.ts",
  "84_50_000",
  "accounting must not invent revenue",
);

// Situation Room — no placeholder critical alerts / domains
mustContain(
  "src/mission-control/situation-room/providers.ts",
  "awaiting-enterprise-ssot",
  "situation room empty posture",
);
mustNotContain(
  "src/mission-control/situation-room/providers.ts",
  "Document verification near SLA breach",
  "situation room must not invent SLA alerts",
);

// EDW empty
mustContain(
  "src/mission-control/executive-decision-workspace/providers.ts",
  "return [];",
  "EDW empty arrays",
);
mustNotContain(
  "src/mission-control/executive-decision-workspace/providers.ts",
  "Placeholder Branch",
  "EDW must not invent highlights",
);

// Observability — no invented uptime
mustNotContain(
  "src/mission-control/shared/enterprise-observability-framework/registry/index.ts",
  "99.4%",
  "observability must not invent uptime",
);
mustNotContain(
  "src/mission-control/shared/enterprise-observability-framework/registry/index.ts",
  "42ms p95",
  "observability must not invent latency",
);

// Security — no invented control %
mustNotContain(
  "src/mission-control/shared/enterprise-security-framework/registry/publishers.ts",
  "86% placeholder",
  "security must not invent control %",
);

// Horizon — empty sample initiatives
mustContain(
  "src/horizon/providers.ts",
  "sample portfolio removed",
  "horizon sampleInitiatives emptied",
);

// C360 — no Math.random income
mustNotContain(
  "src/components/catalyst-one/customers/providers/customer-360-placeholder-provider.ts",
  "Math.random()",
  "C360 must not Math.random income",
);

// scaleCount floor
mustContain(
  "src/lib/dashboard-metrics.ts",
  "Math.max(0,",
  "scaleCount must not invent floor 1",
);

// Partner seeds disabled
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "seeds retired",
  "partner deterministic seeds disabled",
);

// Analyze Deal
mustContain(
  "src/lib/analyze-deal/mock-recommendations.ts",
  "recommendations: []",
  "analyze deal empty recommendations",
);

// EDL banner
mustContain(
  "src/components/catalyst-one/enterprise-decision-ledger/enterprise-decision-ledger-view.tsx",
  "in-memory ports",
  "EDL in-memory banner",
);

// Executive intelligence empty
mustNotContain(
  "src/mission-control/shared/executive-intelligence/providers/index.ts",
  "Three operational areas require attention",
  "executive insights must not invent narratives",
);

if (failures.length) {
  console.error("CO-ORG-004 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-ORG-004 verify PASS (engineering gate — not Business Certification)");
