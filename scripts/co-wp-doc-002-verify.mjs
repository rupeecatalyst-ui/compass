#!/usr/bin/env node
/**
 * CO-WP-DOC-002 — structural verify (Gateway + architecture; no DB mutation).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "createUnclassifiedDocumentTypeRef",
  "freeform inbox typeRef",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  'modeIn === "inbox"',
  "inbox intake mode",
);
mustContain(
  "server/services/partner-gateway/partner-ssot-projections.ts",
  'toDocumentUploadSource("WEALTH_PARTNER")',
  "wealth_partner stamp",
);
mustContain(
  "src/lib/enterprise-partner-lod/project.ts",
  "isUnclassifiedDocumentTypeRef",
  "no fuzzy other→requirement",
);
mustContain(
  "src/lib/enterprise-partner-lod/project.ts",
  "pending_verification",
  "upload≠verified",
);
mustContain(
  "src/app/api/partner/opportunities/[opportunityId]/documents/route.ts",
  "intakeMode",
  "multipart intakeMode",
);
mustContain(
  "src/constants/document-intake/index.ts",
  "DOCUMENT_INTAKE_UNCLASSIFIED_TYPE_PREFIX",
  "unclassified prefix",
);

const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
for (const forbidden of [
  "model WealthPartnerDocument",
  "model CompassDocument",
  "model WalkInDocument",
]) {
  if (schema.includes(forbidden)) {
    failures.push(`Forbidden parallel store: ${forbidden}`);
  }
}

if (failures.length) {
  console.error("CO-WP-DOC-002 verify: FAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("CO-WP-DOC-002 verify: PASS");
console.log(
  JSON.stringify(
    {
      sprint: "CO-WP-DOC-002",
      parallelStores: false,
      uploadEqualsVerified: false,
      deploy: false,
    },
    null,
    2,
  ),
);
