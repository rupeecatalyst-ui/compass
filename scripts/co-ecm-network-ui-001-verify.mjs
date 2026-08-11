/**
 * CO-ECM-NETWORK-UI-001 — Wealth Partner Workspace scroll classification verify.
 * Ensures Network / Add Member desk is document-scroll (not locked-fill).
 */
import {
  isEnterpriseRegistryDocumentScrollPath,
  isEnterpriseRegistryFullWidthPath,
} from "../src/constants/enterprise-registry-workspace.ts";

const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

const listPath = "/wealth-partners";
const workspacePath = "/wealth-partners/cms9apix90003wejcooyto6ij/workspace";
const workspaceTabish = "/wealth-partners/abc/workspace/";

assert(isEnterpriseRegistryFullWidthPath(listPath), "list remains full-width");
assert(isEnterpriseRegistryFullWidthPath(workspacePath), "workspace remains full-width");
assert(
  !isEnterpriseRegistryDocumentScrollPath(listPath),
  "list must stay locked-fill (not document-scroll)",
);
assert(
  isEnterpriseRegistryDocumentScrollPath(workspacePath),
  "workspace must be document-scroll",
);
assert(
  isEnterpriseRegistryDocumentScrollPath(workspaceTabish),
  "workspace trailing slash still document-scroll",
);

// Mirror dashboard-layout lock rule
function isLockedFillDesk(pathname) {
  const isRegistryFullWidth = isEnterpriseRegistryFullWidthPath(pathname);
  const isRegistryDocumentScroll = isEnterpriseRegistryDocumentScrollPath(pathname);
  return (
    (isRegistryFullWidth && !isRegistryDocumentScroll) ||
    pathname.startsWith("/loan-files") ||
    pathname.startsWith("/deals") ||
    pathname.startsWith("/admin/credit-risk-engine")
  );
}

assert(isLockedFillDesk(listPath), "list remains locked-fill desk");
assert(!isLockedFillDesk(workspacePath), "workspace must NOT lock main overflow");

if (failures.length) {
  console.error("CO-ECM-NETWORK-UI-001 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      list: { fullWidth: true, documentScroll: false, lockedFill: true },
      workspace: { fullWidth: true, documentScroll: true, lockedFill: false },
      mainOverflow: "overflow-y-auto on Partner Workspace",
    },
    null,
    2,
  ),
);
console.log("CO-ECM-NETWORK-UI-001 VERIFY PASS");
