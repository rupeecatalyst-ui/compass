import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyProgrammeEditorState } from "../src/lib/product-programme-operations/editor-state.ts";
import { toProgrammeWritePayload } from "../src/lib/product-programme-operations/to-write-payload.ts";
import { deriveEmploymentFamily } from "../src/lib/product-programme-operations/employment.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const editor = readFileSync(
  join(root, "src/components/catalyst-one/product-programme-operations/programme-editor.tsx"),
  "utf8",
);
const workspace = readFileSync(
  join(root, "src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx"),
  "utf8",
);

const required = [
  "Programme Identity",
  "Applicant and Constitution",
  "Geography and Transaction",
  "Eligibility",
  "Loan Amount and Tenure",
  "Pricing and Charges",
  "Policy",
  "Required Documents",
  "Effective Dates",
  "Review and Publication",
  "Save Draft",
  "ControlledMultiSelect",
  "EDIE_CATALOG",
];
for (const token of required) {
  if (!editor.includes(token)) {
    console.error(`Editor missing ${token}`);
    process.exit(1);
  }
}
if (workspace.includes("NewProductProgramWizard")) {
  console.error("Legacy free-text wizard still mounted on the programmes desk.");
  process.exit(1);
}
if (workspace.includes("e.g. Salaried")) {
  console.error("Free-text employment placeholder remains.");
  process.exit(1);
}

const payload = toProgrammeWritePayload({
  ...emptyProgrammeEditorState(),
  lenderId: "fixture-lender",
  code: "FIX-HL",
  label: "Fixture programme",
});
if ("employmentFamily" in payload) {
  console.error("Derived employment family must not be written.");
  process.exit(1);
}
if (deriveEmploymentFamily(["salaried", "self-employed-professional"]) !== "both") {
  console.error("Both family derivation failed.");
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, sections: 10, wizardRemoved: true }, null, 2));
process.exit(0);
