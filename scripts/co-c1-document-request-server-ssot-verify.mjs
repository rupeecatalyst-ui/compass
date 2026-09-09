/**
 * Server-authoritative Document Request SSOT verification.
 */
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { DOCUMENT_REQUESTS_STORAGE_KEY, DOCUMENT_REQUESTS_UI_STORAGE_KEY } from "../src/constants/document-requests/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function expect(label, ok) {
  if (ok) console.log(`PASS  ${label}`);
  else {
    console.log(`FAIL  ${label}`);
    failed += 1;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

expect("UI storage key is presentation-only", DOCUMENT_REQUESTS_UI_STORAGE_KEY.includes(".ui."));
expect("legacy storage key remains named", DOCUMENT_REQUESTS_STORAGE_KEY.includes("document-requests.v1"));

const store = read("src/lib/document-requests/store.ts");
expect("store removes legacy business localStorage", store.includes("removeItem(DOCUMENT_REQUESTS_STORAGE_KEY)"));
expect("store keeps UI presentation key", store.includes("DOCUMENT_REQUESTS_UI_STORAGE_KEY"));
expect("store hydrates from server", store.includes("hydrateDocumentRequestStateFromServer"));
expect("store does not write lodItems to localStorage", !/localStorage\.setItem\(DOCUMENT_REQUESTS_STORAGE_KEY/.test(store));

const ssot = read("server/services/document-workspace/document-request-ssot.service.ts");
expect("lod checklist kind is dedicated", ssot.includes('DOCUMENT_REQUEST_KIND_LOD_CHECKLIST = "lod_checklist"'));
expect("ssot uses existing customer request table", ssot.includes("enterpriseDocumentCustomerRequest"));
expect(
  "ssot does not write Deal programme stamps",
  !/prisma\.enterpriseDeal\./.test(ssot),
);
expect("ssot re-reads selected refs", ssot.includes("loadAuthoritativeSelectedItems"));

const svc = read("server/services/document-workspace/document-workspace-refinement-014d.service.ts");
expect("014d no longer reads browser store", !svc.includes("getDocumentRequestState"));
expect("014d persists lod checklist", svc.includes("persistLodChecklistItems"));
expect("014d revalidates from durable selected items", svc.includes("loadAuthoritativeSelectedItems"));
expect(
  "014d does not write Deal stamps",
  !/prisma\.enterpriseDeal\.(update|updateMany|upsert|create)/.test(svc),
);

const mig = read("prisma/migrations/20260909140000_co_c1_document_request_server_ssot/migration.sql");
expect("migration is additive", mig.includes("ADD COLUMN IF NOT EXISTS"));
expect("migration has no drops", !/\bDROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT)\b/i.test(mig));
expect("migration has no truncate", !/\bTRUNCATE\b/i.test(mig));
expect("migration does not rewrite deals", !/enterprise_deals/i.test(mig));

const desk = read("src/components/catalyst-one/document-workspace/document-workspace.tsx");
expect("workspace hydrates checklist from API", desk.includes('view: "lod-checklist"') && desk.includes("hydrateDocumentRequestStateFromServer"));

if (failed) {
  console.error(`\nDocument Request SSOT verify FAIL (${failed})`);
  process.exit(1);
}
console.log("\nPASS  CO-C1-DOCUMENT-REQUEST-SERVER-SSOT");
