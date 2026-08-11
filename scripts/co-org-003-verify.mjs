#!/usr/bin/env node
/**
 * CO-ORG-003 — static gate: Enterprise Activity Registry SSOT wiring.
 * Engineering gate only — does NOT satisfy Business Certification.
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

mustExist("src/types/enterprise-activity-registry.ts", "EAR types");
mustExist("src/lib/enterprise-activity-registry/index.ts", "EAR lib");
mustExist("server/services/enterprise-activity/enterprise-activity.service.ts", "EAR service");
mustExist("server/repositories/enterprise-activity/enterprise-activity.repository.ts", "EAR repo");
mustExist("src/app/api/enterprise-activity/route.ts", "EAR API");
mustExist(
  "prisma/migrations/20260807180000_co_org_003_enterprise_activity_registry/migration.sql",
  "EAR migration",
);
mustExist(".cursor/rules/enterprise-activity-registry.mdc", "EAR rule");
mustExist("docs/co-org-003/CO-ORG-003-ACTIVATION-REPORT.md", "activation report");
mustExist("docs/co-org-003/CO-ORG-003-REPLACEMENT-CERTIFICATION.md", "replacement certification");
mustExist("docs/co-org-003/CO-ORG-003-BUSINESS-CERTIFICATION-REPORT.md", "biz cert report");

mustContain("prisma/schema.prisma", "model EnterpriseActivityEvent", "schema EAR model");
mustContain(
  "prisma/schema.prisma",
  '@@map("enterprise_activity_events")',
  "schema EAR table map",
);

mustContain(
  "src/lib/enterprise-dialogue-center/timeline-registry.ts",
  "emitEnterpriseActivityBestEffort",
  "EDC dual-writes EAR",
);
mustContain(
  "server/repositories/enterprise-deal/enterprise-deal.repository.ts",
  'sourceSystem: "deal_timeline"',
  "Deal Timeline dual-writes EAR",
);
mustContain(
  "server/services/organization-workspace/organization-workspace.service.ts",
  'sourceSystem: "org"',
  "Org MDM dual-writes EAR",
);
mustContain(
  "server/services/enterprise-conversation-activity/enterprise-conversation-activity.service.ts",
  'sourceSystem: "ecie"',
  "ECIE dual-writes EAR",
);

mustContain(
  "src/components/catalyst-one/activity-timeline.tsx",
  "listEnterpriseActivity",
  "Dashboard reads EAR",
);
mustContain(
  "src/components/catalyst-one/organization/organization-dashboard-panels.tsx",
  "listEnterpriseActivity",
  "Org dashboard reads EAR",
);
mustContain(
  "src/components/catalyst-one/opportunity-workspace/workspace-dialogue-panel.tsx",
  "hydrateEdcFromEar",
  "OW Dialogue hydrates EAR",
);
mustContain(
  "src/mission-control/situation-room/providers.ts",
  "listEnterpriseActivity",
  "Mission Control reads EAR",
);

mustNotContain(
  "src/mission-control/situation-room/providers.ts",
  "Placeholder activity for elevated credit",
  "MC must not ship credit placeholder activity",
);
mustNotContain(
  "src/mission-control/situation-room/providers.ts",
  "SLA watch item updated",
  "MC must not ship SLA placeholder activity",
);

mustContain(
  "src/lib/enterprise-conversation-intelligence/activity-registry.ts",
  "Conversation Activity Registry",
  "ECIE naming clarified",
);

if (failures.length) {
  console.error("CO-ORG-003 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-ORG-003 verify PASS (engineering gate — not Business Certification)");
