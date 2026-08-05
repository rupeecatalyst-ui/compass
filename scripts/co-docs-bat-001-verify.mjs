/**
 * CO-DOCS-BAT-001 — Document Center natural page scroll (static gates).
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const p = join(root, rel);
  assert.ok(existsSync(p), `Missing: ${rel}`);
  return readFileSync(p, "utf8");
}

const constants = read("src/constants/enterprise-registry-workspace.ts");
assert.match(
  constants,
  /ENTERPRISE_REGISTRY_DOCUMENT_SCROLL_PATH_PREFIXES[\s\S]*\/document-center/,
  "document-center must be a document-scroll path",
);

const layout = read("src/layouts/dashboard-layout.tsx");
assert.match(layout, /isEnterpriseRegistryDocumentScrollPath/);
assert.match(layout, /isLockedFillDesk/);
assert.match(
  layout,
  /!isRegistryDocumentScroll && "h-full"/,
  "document-scroll registries must not force h-full",
);

const ws = read(
  "src/components/catalyst-one/document-center/document-center-workspace.tsx",
);
assert.doesNotMatch(
  ws,
  /-mx-4 flex min-h-0 flex-col md:-mx-6/,
  "legacy negative-margin scroll wrapper must be removed",
);
assert.match(ws, /LeadOpportunityJourneyChrome/);

const doc = read("docs/co-docs-bat-001/CO-DOCS-BAT-001-SCROLL-RESOLUTION.md");
assert.match(doc, /CO-DOCS-BAT-001/);
assert.match(doc, /overflow-hidden/);

console.log("CO-DOCS-BAT-001 verify: PASS");
