/**
 * CO-BIZ-005 — structural readiness check.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const compose = readFileSync(
  join(root, "src/lib/enterprise-rm-workspace/compose.ts"),
  "utf8",
);
assert.match(compose, /composeRmWorkspaceSnapshot/);
assert.match(compose, /projectRmTodayWork/);
assert.match(compose, /projectRmPipeline/);
assert.match(compose, /deriveRmPriorities/);

const pack = readFileSync(
  join(root, "src/components/catalyst-one/user-home-dashboard/rm-workspace-pack.tsx"),
  "utf8",
);
assert.match(pack, /RmWorkspacePack/);
assert.match(pack, /CHANAKYA Daily Briefing/);

const home = readFileSync(
  join(root, "src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx"),
  "utf8",
);
assert.match(home, /RmWorkspacePack/);

const report = readFileSync(
  join(root, "docs/co-biz-005/CO-BIZ-005-RM-WORKSPACE-READINESS-REPORT.md"),
  "utf8",
);
assert.match(report, /Overall RM Workspace Score/);

console.log("CO-BIZ-005 RM Workspace structural verify OK");
