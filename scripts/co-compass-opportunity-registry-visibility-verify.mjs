#!/usr/bin/env node
/** COMPASS-originated Opportunities remain visible in the standard registry query. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const repo = readFileSync(
  join(root, "server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts"),
  "utf8",
);
assert.doesNotMatch(repo, /lifecycleStatus:\s*\{\s*not:\s*"dialogue"/);
assert.doesNotMatch(repo, /lifecycleStatus:\s*\{\s*notIn:.*dialogue/);

const filters = readFileSync(join(root, "src/types/opportunity-registry.ts"), "utf8");
assert.match(filters, /status:\s*"all"/);

const labels = readFileSync(join(root, "src/constants/opportunity-lifecycle.ts"), "utf8");
assert.match(labels, /dialogue:\s*"Dialogue"/);

const visibility = readFileSync(
  join(root, "server/services/enterprise-case-visibility/build-visibility-where.ts"),
  "utf8",
);
assert.match(visibility, /sourceCode:\s*COMPASS_WEBSITE_SOURCE_CODE/);
assert.match(visibility, /buildOpportunityVisibilityOrFilters/);

const start = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-journey.service.ts"),
  "utf8",
);
assert.match(start, /website_compass|COMPASS_WEBSITE_SOURCE_CODE/);
assert.match(start, /lifecycleStatus:\s*"dialogue"|OPPORTUNITY_LIFECYCLE\.DIALOGUE|dialogue/);

console.log("CO-COMPASS-OPPORTUNITY-REGISTRY-VISIBILITY verify: PASS");
