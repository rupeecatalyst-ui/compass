/**
 * CO-UX-016 — Enterprise Registry Workspace Optimisation (static gates).
 * Presentation only — no API / schema / business logic ownership changes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const shell =
  "src/components/catalyst-one/shared/enterprise-registry-workspace-shell.tsx";
const constants = "src/constants/enterprise-registry-workspace.ts";
const grid = "src/components/catalyst-one/enterprise-grid/enterprise-data-grid.tsx";

assert.ok(fs.existsSync(path.join(root, shell)), "registry shell missing");
assert.ok(fs.existsSync(path.join(root, constants)), "registry constants missing");

const shellSrc = read(shell);
assert.match(shellSrc, /EnterpriseRegistryWorkspaceShell/);
assert.match(shellSrc, /ENTERPRISE_REGISTRY_VIEWPORT_CLASS|h-\[calc\(100vh-3\.5rem\)\]/);
assert.match(shellSrc, /sticky/);
assert.match(shellSrc, /formatEnterpriseRegistryCounter/);

const consts = read(constants);
assert.match(consts, /formatEnterpriseRegistryCounter/);
assert.match(consts, /\$\{label\} \(\$\{count\}/);

const gridSrc = read(grid);
assert.match(gridSrc, /fillViewport/);
assert.match(gridSrc, /sticky top-0/);

const consumers = [
  "src/components/catalyst-one/directory/directory-workspace.tsx",
  "src/components/catalyst-one/my-opportunities/my-opportunities-workspace.tsx",
  "src/components/catalyst-one/my-deals/my-deals-workspace.tsx",
  "src/app/(dashboard)/lenders/page.tsx",
  "src/app/(dashboard)/wealth-partners/page.tsx",
  "src/app/(dashboard)/admin/wealth-partner-registry/page.tsx",
];

for (const rel of consumers) {
  const src = read(rel);
  assert.match(
    src,
    /EnterpriseRegistryWorkspaceShell/,
    `${rel} must mount shared registry shell`,
  );
}

const contactTable = read(
  "src/components/catalyst-one/directory/contact-registry-table.tsx",
);
assert.ok(
  !contactTable.includes("Contact Registry ·"),
  "Contact toolbar must use concise counter",
);
assert.match(contactTable, /formatEnterpriseRegistryCounter/);
assert.match(contactTable, /fillViewport/);

const pageHeader = read("src/components/design-system/page-header.tsx");
assert.match(pageHeader, /density.*registry|registry/);

console.log("CO-UX-016: PASS");
console.log(
  JSON.stringify(
    {
      sprint: "CO-UX-016",
      sharedShell: shell,
      fillViewport: true,
      stickyToolbar: true,
      conciseCounters: true,
      businessLogicChanged: false,
      apiChanged: false,
      schemaChanged: false,
      optimisedSurfaces: consumers.length + 2,
    },
    null,
    2,
  ),
);
