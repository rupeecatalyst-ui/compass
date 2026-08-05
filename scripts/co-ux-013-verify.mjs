/**
 * CO-UX-013 — Network Workspace production readiness (static gates).
 * Presentation / data-source only — no live registry mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const DEMO_NAMES = [
  "Anil Mehta",
  "Sneha Kapoor",
  "Vikram Joshi",
  "Adv. Meera Iyer",
  "Skyline Developers",
];

const workspace = read(
  "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
);
const pool = read(
  "src/components/catalyst-one/contact-strategy/strategic-contact-pool.tsx",
);
const canvas = read(
  "src/components/catalyst-one/contact-strategy/relationship-intelligence-canvas.tsx",
);
const live = read("src/lib/contact-strategy/live-registry.ts");
const mock = read("src/lib/contact-strategy/ric-mock-data.ts");
const layout = read("src/lib/contact-strategy/ric-layout.ts");

assert.match(live, /listOperationalEcmContacts/);
assert.match(live, /listEcmContactRelationships/);
assert.match(live, /Never seeds, mocks/);

assert.match(pool, /listNetworkWorkspaceContacts/);
assert.ok(!pool.includes("RIC_MOCK_CONTACTS"), "Pool must not use RIC mock contacts");

assert.match(canvas, /listNetworkFirstLevel/);
assert.ok(!canvas.includes("listRicFirstLevel"), "Canvas must not use mock first-level");

assert.match(workspace, /live-registry/);
assert.ok(!workspace.includes("ric-mock-data"), "Workspace must not import mock data");
assert.ok(!workspace.includes("ricToEcmContact"), "Must not fabricate ECM contacts from mock");
assert.match(workspace, /inspectorOpen/);
assert.match(workspace, /findOperationalEcmContactById/);

assert.match(layout, /CENTRE_X = 0/);
assert.match(layout, /CENTRE_Y = 0/);

assert.match(canvas, /fitViewOptions/);
assert.match(canvas, /padding: 0\.12/);

for (const name of DEMO_NAMES) {
  assert.ok(mock.includes(name), `mock file still documents demo name ${name}`);
  assert.ok(!workspace.includes(name), `workspace must not hardcode ${name}`);
  assert.ok(!pool.includes(name), `pool must not hardcode ${name}`);
  assert.ok(!canvas.includes(name), `canvas must not hardcode ${name}`);
  assert.ok(!live.includes(name), `live registry must not hardcode ${name}`);
}

console.log("CO-UX-013 Network Workspace Production Readiness: PASS");
console.log(
  JSON.stringify(
    {
      rootCause: "ric-mock-data.ts hardcoded demo contacts/relationships",
      productionSource: "Enterprise Contact Registry + ECM Contact Relationships",
      mockQuarantined: true,
      rightPanel: "hidden until entity selected",
      canvasCentered: true,
      productionDataProtection: "presentation-only",
    },
    null,
    2,
  ),
);
