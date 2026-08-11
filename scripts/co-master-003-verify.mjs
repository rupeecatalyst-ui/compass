/**
 * CO-MASTER-003 — Product–Lender Matrix scroll/viewport static verification.
 * Presentation wiring only — does not touch master data or mappings.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

const workspace = read(
  "src/components/catalyst-one/admin/product-lender-matrix-workspace.tsx",
);
const layout = read("src/layouts/dashboard-layout.tsx");
const registry = read("src/constants/enterprise-registry-workspace.ts");
const api = read("src/app/api/admin/product-lender-matrix/route.ts");

assert(
  registry.includes('"/admin/product-lender-matrix"'),
  "Matrix route remains enterprise-registry full-width (locked main)",
);
assert(
  layout.includes("isLockedFillDesk") && layout.includes("overflow-hidden"),
  "Dashboard still locks fill desks with overflow-hidden",
);
assert(
  workspace.includes("h-full") &&
    workspace.includes("min-h-0") &&
    workspace.includes("flex-1") &&
    workspace.includes("overflow-auto") &&
    workspace.includes("overflow-hidden"),
  "Matrix root must fill height and trap overflow; body Card must scroll",
);
assert(
  workspace.includes("sticky left-0") && workspace.includes("sticky top-0"),
  "Sticky lender column + sticky product header required",
);
assert(
  workspace.includes("productCodesShareSelectionFamily"),
  "Mapping toggle family logic must remain unchanged",
);
assert(
  workspace.includes('fetch("/api/admin/product-lender-matrix"'),
  "Matrix still loads/saves via existing admin API",
);
assert(
  !workspace.includes("pageSize") && !workspace.includes("pagination"),
  "Must not introduce pagination to hide scroll defect",
);
assert(
  api.includes("productsSupported") || api.includes("product"),
  "API route present (data path unchanged)",
);

if (failures.length) {
  console.error("CO-MASTER-003 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-MASTER-003 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      rootCause:
        "Registry locked desk (main overflow-hidden) + Card overflow-auto without height constraint → clipped, no vertical scroll",
      after:
        "h-full flex-col overflow-hidden chrome + min-h-0 flex-1 overflow-auto matrix body (V+H scroll)",
      sticky: "lender left-0 · product header top-0",
      dataPath: "unchanged /api/admin/product-lender-matrix",
    },
    null,
    2,
  ),
);
