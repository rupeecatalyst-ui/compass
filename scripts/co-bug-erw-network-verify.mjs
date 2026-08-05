/**
 * CO-BUG-ERW-NETWORK — Relationship Network must only show explicit registry edges.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const buildGraph = read("src/lib/enterprise-relationship-workspace/build-graph.ts");
assert.doesNotMatch(buildGraph, /illustrativeEcosystem/);
assert.doesNotMatch(buildGraph, /roleProjectionNodes/);
assert.doesNotMatch(buildGraph, /loanStructureLinkNodes/);
assert.doesNotMatch(buildGraph, /isIllustrative:\s*true/);
assert.match(buildGraph, /companyLinkNodes/);
assert.match(buildGraph, /ecmRelationshipNodes/);
assert.match(buildGraph, /isErwNetworkEcosystemCode/);
assert.match(buildGraph, /No relationships have been defined for this contact/);

const master = read(
  "src/constants/enterprise-relationship-workspace/relationship-master.ts",
);
assert.match(master, /ERW_NETWORK_ECOSYSTEM_CODES/);
assert.match(master, /ERW_NETWORK_EXCLUDED_CODES/);
assert.match(master, /isErwNetworkEcosystemCode/);
assert.match(master, /bank_rm/);
assert.match(master, /wealth_partner/);

const graphUi = read(
  "src/components/catalyst-one/enterprise-relationship-workspace/enterprise-relationship-graph.tsx",
);
assert.match(graphUi, /No relationships have been defined for this contact/);
assert.match(graphUi, /Add Relationship/);
assert.match(graphUi, /onAddRelationship/);

const workspace = read(
  "src/components/catalyst-one/enterprise-relationship-workspace/enterprise-relationship-workspace.tsx",
);
assert.match(workspace, /onAddRelationship=\{onAddRelationship\}/);
assert.match(workspace, /Explicit Relationship Registry/);

console.log("CO-BUG-ERW-NETWORK verify: PASS");
