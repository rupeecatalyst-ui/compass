/**
 * CO-DEAL-LIFECYCLE-REFINEMENT-001 — Stage SSOT sync · Radar exit · Kanban amount.
 * No production data mutation.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  lenderCaseStageToPipelineStageProjection,
  grossStageToLenderCaseStage,
} from "../src/lib/enterprise-deal/deal-lender-stage-map.ts";
import {
  lenderCaseStageToJourneySegment,
  deriveJourneyProgressSegments,
} from "../src/constants/enterprise-deal-journey-progress.ts";
import {
  CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES,
  CHANAKYA_RADAR_EXCLUDED_DEAL_STAGES,
} from "../src/constants/chanakya-radar.ts";
import { isLiveActiveLoanFile } from "../src/lib/chanakya-live-intelligence/live-ssot.ts";
import { assertDealStageAuthority } from "../src/lib/enterprise-deal/deal-stage-projection.ts";
import type { LoanFile } from "../src/types/catalyst-one.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  const abs = join(root, rel);
  assert.ok(existsSync(abs), `Missing: ${rel}`);
  return readFileSync(abs, "utf8");
}

function mustContain(rel: string, needle: string, label?: string) {
  assert.ok(read(rel).includes(needle), `${label ?? rel}: expected "${needle}"`);
}

assert.equal(assertDealStageAuthority(), "EnterpriseDeal.grossStage");

mustContain(
  "src/lib/enterprise-deal/deal-lender-stage-map.ts",
  'return "post_disbursement_confirmation"',
  "PDC projection preserved",
);
mustContain(
  "src/lib/enterprise-deal/map-deal-to-loan-file.ts",
  "canonicalCaseStage = grossStageToLenderCaseStage(deal.grossStage)",
  "LoanFile lenders sync from Deal.grossStage",
);
mustContain(
  "src/components/catalyst-one/my-deals/opportunity-lender-journey-card.tsx",
  "pickPreferredDealForOpportunity",
  "My Deals Stage uses preferred Deal grossStageLabel",
);
mustContain(
  "src/components/catalyst-one/execution/lender-pipeline-board.tsx",
  "formatINR(loanAmount)",
  "Kanban card shows loan amount",
);
mustContain(
  "src/constants/enterprise-deal-journey-progress.ts",
  'id: "post_disbursement_confirmation"',
  "journey includes PDC segment",
);

// Stage chain projections stay coherent (canonical LenderCaseStage → display + journey).
const chain = [
  "prelogin",
  "logged_in_wip",
  "final_approved",
  "closure_wip",
  "disbursed",
  "post_disbursement_confirmation",
] as const;

for (const s of chain) {
  assert.equal(grossStageToLenderCaseStage(s), s);
}

assert.equal(
  lenderCaseStageToPipelineStageProjection("post_disbursement_confirmation"),
  "post_disbursement_confirmation",
);
assert.notEqual(
  lenderCaseStageToPipelineStageProjection("post_disbursement_confirmation"),
  "pre_login",
);
assert.equal(lenderCaseStageToPipelineStageProjection("lost"), "lost");
assert.equal(lenderCaseStageToPipelineStageProjection("disbursed"), "won");

assert.equal(
  lenderCaseStageToJourneySegment("post_disbursement_confirmation"),
  "post_disbursement_confirmation",
);
assert.equal(lenderCaseStageToJourneySegment("disbursed"), "disbursed");

const progress = deriveJourneyProgressSegments({
  lenderCaseStage: "post_disbursement_confirmation",
  // Stale lossy PipelineStage must not win over canonical lender stage.
  pipelineStage: "pre_login",
});
assert.equal(progress.segmentId, "post_disbursement_confirmation");
assert.match(progress.segmentLabel, /Post-Disbursement Confirmation/i);

assert.ok(
  CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES.has("post_disbursement_confirmation"),
);
assert.ok(!CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES.has("disbursed"));
assert.ok(
  CHANAKYA_RADAR_EXCLUDED_DEAL_STAGES.has("post_disbursement_confirmation"),
);
assert.ok(!CHANAKYA_RADAR_EXCLUDED_DEAL_STAGES.has("disbursed"));
assert.ok(!CHANAKYA_RADAR_EXCLUDED_DEAL_STAGES.has("won"));
assert.ok(CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES.has("lost"));

const disbursedFile = {
  id: "deal-disbursed-1",
  customerName: "Runtime Verify Borrower",
  stage: "won",
  lenders: [
    {
      id: "l1",
      lender: "HSBC",
      status: "active",
      caseStage: "disbursed",
      isPrimary: true,
    },
  ],
} as LoanFile;
assert.equal(
  isLiveActiveLoanFile(disbursedFile),
  true,
  "Disbursed must remain Radar-eligible",
);

const pdcFile = {
  id: "deal-pdc-1",
  customerName: "Runtime Verify Borrower",
  stage: "post_disbursement_confirmation",
  lenders: [
    {
      id: "l1",
      lender: "HSBC",
      status: "active",
      caseStage: "post_disbursement_confirmation",
      isPrimary: true,
    },
  ],
} as LoanFile;
assert.equal(isLiveActiveLoanFile(pdcFile), false, "PDC must exit Radar");

const lostFile = {
  id: "deal-lost-1",
  customerName: "Runtime Verify Borrower",
  stage: "lost",
  lenders: [
    {
      id: "l1",
      lender: "HSBC",
      status: "active",
      caseStage: "lost",
      isPrimary: true,
    },
  ],
} as LoanFile;
assert.equal(isLiveActiveLoanFile(lostFile), false, "Lost must exit Radar");

// Historical inconsistency class: Registry already had PDC; lossy projection showed Pre-Login.
// Fix is projection/display — no silent production row rewrite in this verifier.
assert.notEqual(
  lenderCaseStageToPipelineStageProjection("post_disbursement_confirmation"),
  "pre_login",
  "historical PDC rows no longer project as Pre-Login",
);

console.log(
  "CO-DEAL-LIFECYCLE-REFINEMENT-001 verify OK — stage SSOT · Radar exit · Kanban amount.",
);
