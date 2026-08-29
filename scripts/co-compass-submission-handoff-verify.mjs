#!/usr/bin/env node
/** Submission handoff — repository-scoped update + idempotent operational emitters. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const journey = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-journey.service.ts"),
  "utf8",
);
const handoff = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-operational-handoff.service.ts"),
  "utf8",
);
const orgResolver = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-organization.resolver.ts"),
  "utf8",
);

assert.match(journey, /resolveCompassGatewayOrganizationId/);
assert.match(journey, /enterpriseOpportunityRepository\.updateOpportunity/);
assert.match(journey, /organizationId,\s*row\.id/);
assert.match(journey, /executeCompassFirstSubmissionHandoff/);
assert.match(journey, /snapshotHasOperationalHandoff/);
assert.match(journey, /COMPASS_OPERATIONAL_HANDOFF_SNAPSHOT_KEY/);
assert.match(journey, /alreadyHandedOff/);
assert.match(journey, /lifecycleStatus:\s*"requirement_captured"/);
assert.doesNotMatch(journey, /enterpriseOpportunityService\.updateOpportunity/);

assert.match(handoff, /generateTasksForBusinessEvent/);
assert.match(handoff, /enterpriseNotificationService\.fanOutBestEffort/);
assert.match(handoff, /enterpriseActivityService\.emitBestEffort/);
assert.match(handoff, /function snapshotHasOperationalHandoff/);
assert.match(handoff, /compassOperationalHandoffAt/);
assert.match(handoff, /sourceEventId:\s*`compass-submit:\$\{input\.opportunity\.id\}`/);

assert.match(orgResolver, /COMPASS_E2E_ORG_SLUG/);

console.log("CO-COMPASS-SUBMISSION-HANDOFF verify: PASS");
