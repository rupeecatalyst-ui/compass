/**
 * CO-ECM-NETWORK-UI-002 — Wealth Partner Business Network scroll accessibility.
 * Ensures Partner Workspace uses document-scroll page surface (no flex-1 fill trap)
 * so Add Network Member controls remain reachable via main overflow-y-auto.
 */
import fs from "node:fs";
import path from "node:path";
import {
  isEnterpriseRegistryDocumentScrollPath,
  isEnterpriseRegistryFullWidthPath,
  WEALTH_PARTNER_WORKSPACE_PAGE_CLASS,
} from "../src/constants/enterprise-registry-workspace.ts";

const root = process.cwd();
const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const workspacePath = "/wealth-partners/partner123/workspace";
const listPath = "/wealth-partners";

assert(isEnterpriseRegistryFullWidthPath(workspacePath), "workspace stays full-width");
assert(
  isEnterpriseRegistryDocumentScrollPath(workspacePath),
  "workspace must remain document-scroll",
);
assert(
  !isEnterpriseRegistryDocumentScrollPath(listPath),
  "list must stay locked-fill",
);

const lockedFill =
  isEnterpriseRegistryFullWidthPath(workspacePath) &&
  !isEnterpriseRegistryDocumentScrollPath(workspacePath);
assert(!lockedFill, "workspace must not lock main overflow");

assert(
  WEALTH_PARTNER_WORKSPACE_PAGE_CLASS.includes("overflow-visible"),
  "page class must be overflow-visible",
);
assert(
  !WEALTH_PARTNER_WORKSPACE_PAGE_CLASS.includes("flex-1"),
  "page class must not use flex-1 fill trap",
);
assert(
  !WEALTH_PARTNER_WORKSPACE_PAGE_CLASS.includes("min-h-0"),
  "page class must not use min-h-0 fill trap",
);
assert(
  !WEALTH_PARTNER_WORKSPACE_PAGE_CLASS.includes("overflow-hidden"),
  "page class must not clip with overflow-hidden",
);
assert(
  /pb-(16|20|24)/.test(WEALTH_PARTNER_WORKSPACE_PAGE_CLASS),
  "page class must keep bottom padding so Save is reachable",
);

const workspaceSrc = read(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-workspace.tsx",
);
assert(
  workspaceSrc.includes("WEALTH_PARTNER_WORKSPACE_PAGE_CLASS"),
  "workspace must use WEALTH_PARTNER_WORKSPACE_PAGE_CLASS",
);
assert(
  workspaceSrc.includes("CO-ECM-NETWORK-UI-002"),
  "workspace must tag CO-ECM-NETWORK-UI-002",
);
assert(
  workspaceSrc.includes('data-network-add-form'),
  "Network tab must expose add-form marker",
);
assert(
  workspaceSrc.includes("Add Network Member"),
  "Add Network Member CTA retained",
);
assert(
  workspaceSrc.includes("LiveEntityMasterSearch"),
  "Contact/Company search retained",
);
assert(
  !workspaceSrc.includes("ENTERPRISE_REGISTRY_DOCUMENT_CONTENT_PAD_CLASS"),
  "workspace must not use fill-oriented DOCUMENT_CONTENT_PAD",
);

const layoutSrc = read("src/layouts/dashboard-layout.tsx");
assert(
  layoutSrc.includes("min-h-min overflow-visible"),
  "dashboard layout must keep document-scroll motion wrapper unclipped",
);
assert(
  layoutSrc.includes('isLockedFillDesk ? "overflow-hidden" : "overflow-y-auto"'),
  "main must use overflow-y-auto when not locked-fill",
);

if (failures.length) {
  console.error("CO-ECM-NETWORK-UI-002 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      sprint: "CO-ECM-NETWORK-UI-002",
      workspace: {
        documentScroll: true,
        lockedFill: false,
        pageClass: "WEALTH_PARTNER_WORKSPACE_PAGE_CLASS",
        mainOverflow: "overflow-y-auto",
      },
      unchanged: [
        "relationship model",
        "APIs",
        "Contact/Company registries",
        "authorization",
      ],
    },
    null,
    2,
  ),
);
console.log("CO-ECM-NETWORK-UI-002 VERIFY PASS");
