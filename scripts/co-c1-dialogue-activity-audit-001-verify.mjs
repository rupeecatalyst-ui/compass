#!/usr/bin/env node
/**
 * CO-C1-DIALOGUE-ACTIVITY-AUDIT-001 — audit / global Dialogue activation gate.
 * Engineering validation only; never mutates data.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  const path = join(root, relativePath);
  assert.ok(existsSync(path), `Missing: ${relativePath}`);
  return readFileSync(path, "utf8");
}

const routes = read("src/constants/routes.ts");
assert.match(routes, /DIALOGUE:\s*"\/dialogue"/);

const nav = read("src/config/navigation.ts");
assert.match(nav, /title:\s*"Dialogue",\s*href:\s*ROUTES\.DIALOGUE/s);

const dialoguePage = read("src/app/(dashboard)/dialogue/page.tsx");
assert.match(dialoguePage, /DialogueCenterWorkspace/);

const dialogueWorkspace = read(
  "src/components/catalyst-one/dialogue/dialogue-center-workspace.tsx",
);
assert.match(dialogueWorkspace, /hydrateEdcFromEar/);
assert.match(dialogueWorkspace, /if \(!contextId\) return/);
assert.match(dialogueWorkspace, /\(contextId \? entries\.filter/);
assert.doesNotMatch(dialogueWorkspace, /contextId = "opp-demo-001"/);

const earApi = read("src/app/api/enterprise-activity/route.ts");
assert.match(earApi, /requireAccessToken/);
assert.match(earApi, /enterpriseActivityService\.list/);

const earService = read("server/services/enterprise-activity/enterprise-activity.service.ts");
assert.match(earService, /isEnterprisePersistencePrisma/);
assert.match(earService, /enterpriseActivityRepository\.upsertEvent/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /model EnterpriseActivityEvent/);
assert.match(schema, /@@map\("enterprise_activity_events"\)/);

const outbox = read(
  "src/components/catalyst-one/action-center/enterprise-outbox-provider.tsx",
);
assert.match(outbox, /emitEnterpriseActivityBestEffort/);
assert.match(outbox, /eventKind:\s*"communications"/);
assert.match(outbox, /simulateEnceCommunication/);

const lifecycle = read(
  "src/constants/enterprise-notification-communication-engine/lifecycle.ts",
);
assert.match(lifecycle, /ENCE_EXTERNAL_DELIVERY_ENABLED = false/);

const report = join(
  root,
  "docs/co-c1-dialogue-activity-audit-001/CO-C1-DIALOGUE-ACTIVITY-AUDIT-001-REPORT.md",
);
assert.ok(existsSync(report), "Missing Dialogue / Activity audit report");

console.log("CO-C1-DIALOGUE-ACTIVITY-AUDIT-001 verify: PASS");
