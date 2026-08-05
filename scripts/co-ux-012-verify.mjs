/**
 * CO-UX-012 — Strategy Workbench primary heading is Borrower / Customer Name.
 * Presentation-only — no live data mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const workspace = read(
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx",
);
assert.match(workspace, /resolveOpportunityBorrowerIdentity/);
assert.match(workspace, /headerBorrowerName/);
assert.match(
  workspace,
  /title=\{headerBorrowerName \|\| ["']Not Specified["']\}/,
);
assert.ok(
  !/title=\{contact\?\.name \?\? ["']LIFE["']\}/.test(workspace),
  "Must not fall back to stage label LIFE as page title",
);
assert.match(workspace, /Never use the journey stage label/);

const bound = read(
  "src/components/catalyst-one/opportunity-workspace/opportunity-bound-stage.tsx",
);
assert.match(bound, /title: ["']Strategy Workbench["']/);
assert.ok(!/strategy_workbench:\s*\{[^}]*title:\s*["']LIFE["']/.test(bound));
assert.match(bound, /title=\{customer\}/);
assert.match(bound, /Not Specified/);

const stages = read("src/constants/opportunity-workspace-stages.ts");
assert.match(stages, /id: ["']strategy_workbench["']/);
assert.match(stages, /label: ["']LIFE["']/);

console.log("CO-UX-012 Strategy Workbench Header: PASS");
console.log(
  JSON.stringify(
    {
      primaryHeading: "borrower/customer from Opportunity Registry SSOT",
      stageLabelRemainsLife: true,
      neverTitleFromStage: true,
      productionDataProtection: "presentation-only",
    },
    null,
    2,
  ),
);
