/**
 * CO-LENDER-REMEDIATION-001 — static + optional live validation.
 * Static checks never mutate data. Live checks are read-only unless CREATE_JIO=1.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const client = read("src/lib/enterprise-lender-registry/index.ts");

assert.ok(
  client.includes("EnterpriseLenderRegistryWriteError"),
  "P0-A: write error type required",
);
assert.ok(client.includes("apiMutate"), "P0-A: apiMutate required");
assert.ok(
  client.includes("allowSoftGoLive") && client.includes("!isEnterprisePersistencePrisma()"),
  "P0-A: Soft Go-Live only outside prisma",
);

// createLender in prisma path must not call localLenderRegistryStore.createLender
const createBlock = client.slice(
  client.indexOf("async createLender"),
  client.indexOf("async updateLender"),
);
assert.ok(
  createBlock.includes("apiMutate") && createBlock.includes("!allowSoftGoLive()"),
  "P0-A: createLender fail-closed in prisma",
);
assert.ok(
  !createBlock.includes("localLenderRegistryStore.createLender") ||
    createBlock.indexOf("allowSoftGoLive()") <
      createBlock.indexOf("localLenderRegistryStore.createLender"),
  "P0-A: local create only behind allowSoftGoLive",
);

const admin = read(
  "src/components/catalyst-one/lender-registry-admin/lender-registry-admin-workspace.tsx",
);
assert.ok(
  admin.includes("Soft Go-Live local fallback is disabled") ||
    !admin.includes("Baseline programs (local)"),
  "P0-A: baseline seed must not Soft Go-Live fallback in prisma",
);

const wizard = read(
  "src/components/catalyst-one/lender-registry-admin/new-lender-wizard.tsx",
);
assert.ok(
  wizard.includes("listCategoriesAsync"),
  "P0-A: wizard must use API categories",
);

// P0-C hierarchy still ECM projection
assert.ok(
  fs.existsSync(path.join(root, "src/lib/enterprise-lender-directory/compose-hierarchy.ts")),
  "P0-C: compose-hierarchy present",
);
const hierarchyLib = read("src/lib/enterprise-lender-workspace/hierarchy.ts");
assert.ok(
  !hierarchyLib.includes("localStorage.setItem"),
  "P0-C: hierarchy must not write localStorage",
);

console.log("CO-LENDER-REMEDIATION-001 static verify: PASS");
