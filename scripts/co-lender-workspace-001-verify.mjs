/**
 * CO-LENDER-WORKSPACE-001 — operational fix static verification.
 * Confirms stacking + hierarchy action wiring without redesign.
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

const hierarchy = read(
  "src/components/catalyst-one/enterprise-lender-workspace/eld-hierarchy-chart.tsx",
);
const slideOver = read(
  "src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx",
);
const dialog = read("src/components/ui/dialog.tsx");
const actions = read("src/lib/enterprise-lender-directory/hierarchy-actions.ts");
const unsaved = read(
  "src/components/catalyst-one/shared/unsaved-changes-dialog.tsx",
);

assert(dialog.includes("overlayClassName"), "DialogContent must accept overlayClassName");
assert(
  hierarchy.includes("z-[110]"),
  "Hierarchy dialogs must stack above Lender Sheet z-[95]",
);
assert(
  hierarchy.includes("LiveEntityMasterSearch"),
  "Assign must use LiveEntityMasterSearch (canonical ECM picker)",
);
assert(
  hierarchy.includes("createLenderEmployeeForInstitution"),
  "Create must persist via createLenderEmployeeForInstitution",
);
assert(
  hierarchy.includes("assignExistingContactToInstitution"),
  "Assign must persist via assignExistingContactToInstitution",
);
assert(
  hierarchy.includes("onNestedUiOpenChange"),
  "Hierarchy must notify parent when nested UI is open",
);
assert(
  slideOver.includes("hideCloseButton"),
  "Lender Sheet must hide duplicate Radix close",
);
assert(
  slideOver.includes("requestClose"),
  "Close must use useWorkspaceClose requestClose",
);
assert(
  slideOver.includes("hierarchyNestedOpen"),
  "Escape must be gated while hierarchy dialogs are open",
);
assert(
  slideOver.includes('overlayClassName="z-[94]'),
  "Lender Sheet overlay must stack with content",
);
assert(
  slideOver.includes('contentClassName="z-[110]"'),
  "UnsavedChangesDialog must elevate above Sheet",
);
assert(
  actions.includes("already associated with this lender"),
  "Assign must prevent duplicate lender-employee associations",
);
assert(
  actions.includes("persistRegisterEcmContact"),
  "Create must use ECM persist SSOT",
);
assert(
  actions.includes("persistUpdateEcmContact"),
  "Assign must use ECM persist SSOT",
);
assert(
  unsaved.includes("overlayClassName"),
  "UnsavedChangesDialog must forward overlayClassName",
);

if (failures.length) {
  console.error("CO-LENDER-WORKSPACE-001 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-LENDER-WORKSPACE-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      stacking: "Dialog z-[110] above Sheet z-[95]",
      create: "createLenderEmployeeForInstitution → persistRegisterEcmContact",
      assign: "LiveEntityMasterSearch → assignExistingContactToInstitution → persistUpdateEcmContact",
      close: "hideCloseButton + useWorkspaceClose.requestClose",
      duplicates: "blocked when already lender_employee at same institution",
    },
    null,
    2,
  ),
);
