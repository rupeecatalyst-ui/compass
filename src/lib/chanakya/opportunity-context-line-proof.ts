/**
 * Presentation proof for the CHANAKYA Opportunity context line.
 * No database. No assessment creation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  chanakyaContextIdentityFromOpportunity,
  formatChanakyaOpportunityContextLine,
} from "@/lib/chanakya/opportunity-context-line";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

export function runChanakyaOpportunityContextLineProof() {
  const line = formatChanakyaOpportunityContextLine(
    chanakyaContextIdentityFromOpportunity({
      primaryBorrowerKind: "individual",
      primaryContactName: "Rajesh Shah",
      opportunityNumber: "OPP-2026-000137",
      productLabel: "Home Loan",
      productCode: "HOME_LOAN",
      requestedAmount: 10000000,
    }),
  );
  assert.equal(line, "Rajesh Shah · OPP-2026-000137 · Home Loan · ₹1,00,00,000");
  assert.equal(line.includes("₹1.0 Cr"), false);

  const fromCode = formatChanakyaOpportunityContextLine(
    chanakyaContextIdentityFromOpportunity({
      primaryBorrowerKind: "company",
      companyId: "company-1",
      companyName: "Shah Homes",
      primaryContactName: "Rajesh Shah",
      opportunityNumber: "OPP-2026-000200",
      productCode: "HOME_LOAN",
      requestedAmount: null,
    }),
  );
  assert.equal(fromCode, "Shah Homes · OPP-2026-000200 · HOME_LOAN · Not Specified");

  const workspace = source("src/components/catalyst-one/chanakya/chanakya-recommendation-workspace.tsx");
  const formatter = source("src/lib/chanakya/opportunity-context-line.ts");
  const life = source("src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx");
  const journey = source("src/components/catalyst-one/shared/lead-opportunity-journey-chrome.tsx");
  for (const text of [workspace, formatter]) {
    assert.equal(text.includes("Rajesh Shah"), false);
    assert.equal(text.includes("OPP-2026-000137"), false);
    assert.equal(text.includes("₹1,00,00,000"), false);
    assert.equal(text.includes("getOrCreateAssessment"), false);
    assert.equal(text.includes("updateOpportunity"), false);
  }
  assert.equal(formatter.includes("Home Loan"), false);
  assert.equal(workspace.includes("enterpriseOpportunityApiClient.getOpportunity"), true);
  assert.equal(workspace.includes("enterpriseOpportunityService"), false);
  assert.equal(workspace.includes("formatChanakyaOpportunityContextLine"), true);
  assert.equal(workspace.includes("break-words"), true);
  assert.equal(workspace.includes("truncate"), false);
  assert.equal(life.includes("ChanakyaRecommendationWorkspace"), true);
  assert.equal(journey.includes("ChanakyaRecommendationWorkspace"), true);
  assert.equal(life.includes("formatChanakyaOpportunityContextLine"), false);
  assert.equal(journey.includes("formatChanakyaOpportunityContextLine"), false);
}
