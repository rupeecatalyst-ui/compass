#!/usr/bin/env node
/**
 * CO-DOC-ARCH-001 — structural architecture verify (no DB mutation, no deploy).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function mustExist(rel) {
  const abs = join(root, rel);
  if (!existsSync(abs)) failures.push(`Missing: ${rel}`);
  return abs;
}

function mustContain(rel, needle, label) {
  mustExist(rel);
  const abs = join(root, rel);
  if (!existsSync(abs)) return;
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

mustExist(".cursor/rules/enterprise-document-intake.mdc");
mustExist("docs/co-doc-arch-001/CO-DOC-ARCH-001-ENTERPRISE-DOCUMENT-INTAKE-ARCHITECTURE.md");
mustExist("src/constants/document-intake/index.ts");

mustContain(
  "src/constants/document-intake/index.ts",
  'WALK_IN: "manual_upload"',
  "WALK_IN map",
);
mustContain(
  "src/constants/document-intake/index.ts",
  'DIRECT: "customer_portal"',
  "DIRECT map",
);
mustContain(
  "src/constants/document-intake/index.ts",
  'WEALTH_PARTNER: "wealth_partner"',
  "WEALTH_PARTNER map",
);
mustContain(
  "src/types/document-registry.ts",
  '| "wealth_partner"',
  "registry uploadSource includes wealth_partner",
);
mustContain(
  "server/services/partner-gateway/partner-ssot-projections.ts",
  'toDocumentUploadSource("WEALTH_PARTNER")',
  "partner stamps mapped uploadSource",
);
mustContain(
  "src/lib/document-requests/upload-engine.ts",
  'toDocumentUploadSource("DIRECT")',
  "customer portal stamps DIRECT map",
);
mustContain(
  "prisma/schema.prisma",
  "model EnterpriseTransactionDocument",
  "durable document SSOT",
);
mustContain(
  ".cursor/rules/enterprise-document-intake.mdc",
  "One enterprise document architecture",
  "constitutional rule",
);

// Guard: no parallel partner/compass document models introduced by this sprint
for (const forbidden of [
  "model WealthPartnerDocument",
  "model CompassDocument",
  "model WalkInDocument",
]) {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  if (schema.includes(forbidden)) {
    failures.push(`Forbidden parallel document model present: ${forbidden}`);
  }
}

if (failures.length) {
  console.error("CO-DOC-ARCH-001 verify: FAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

assert.ok(true);
console.log("CO-DOC-ARCH-001 verify: PASS");
console.log(
  JSON.stringify(
    {
      architectureId: "CO-DOC-ARCH-001",
      parallelStores: false,
      dbMutations: false,
      deploy: false,
    },
    null,
    2,
  ),
);
