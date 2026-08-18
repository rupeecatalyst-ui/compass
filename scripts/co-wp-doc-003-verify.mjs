#!/usr/bin/env node
/**
 * CO-WP-DOC-003 — Partner folder upload into existing Document Registry (structural).
 * No migration, no production upload, no deploy.
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

mustContain(
  "server/services/partner-gateway/partner-ssot-projections.ts",
  'toDocumentUploadSource("WEALTH_PARTNER")',
  "wealth_partner stamp",
);
mustContain(
  "server/services/partner-gateway/partner-ssot-projections.ts",
  "packageId",
  "package grouping on existing registry",
);
mustContain(
  "server/services/partner-gateway/partner-ssot-projections.ts",
  "relativePath",
  "relative path metadata",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  'modeIn === "folder"',
  "folder intake mode",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "requireOwnedOpportunity",
  "owned opportunity authorization",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "EAR_EVENT_KINDS.DOCUMENTS",
  "EAR document event",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "partnerDealService.getDeal",
  "deal ownership check",
);
mustContain(
  "src/app/api/partner/opportunities/[opportunityId]/documents/route.ts",
  "relativePath",
  "multipart relative path",
);
mustContain(
  "src/constants/document-intake/index.ts",
  '"folder"',
  "folder partner intake mode",
);
mustContain(
  "src/constants/document-intake/index.ts",
  "Catalyst Connect",
  "source caption",
);
mustContain(
  "src/components/catalyst-one/document-center/document-registry-panel.tsx",
  "documentRegistrySourceLabel",
  "C1 source column",
);
mustContain(
  "src/components/catalyst-one/deal-workspace/deal-documents-projection.tsx",
  "documentRegistrySourceLabel",
  "Deal documents source",
);
mustContain(
  "server/services/enterprise-transaction-documents/enterprise-transaction-document.service.ts",
  "upsertForOrganization",
  "existing ETD SSOT",
);

if (failures.length) {
  console.error("CO-WP-DOC-003 C1 verify: FAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("CO-WP-DOC-003 C1 verify: PASS");
console.log(
  JSON.stringify(
    {
      sprint: "CO-WP-DOC-003",
      ssot: "EnterpriseTransactionDocument + optional EnterpriseDocumentPackage",
      parallelStore: false,
      migration: false,
      deploy: false,
    },
    null,
    2,
  ),
);
