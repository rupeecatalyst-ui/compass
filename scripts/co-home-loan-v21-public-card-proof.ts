import assert from "node:assert/strict";
import { recommendPublishedLendersFromOptions } from "../src/lib/enterprise-lender-registry/recommend-from-registry";
import { buildPartnerRecommendationLoanFile } from "../src/lib/enterprise-partner-recommendations/project";
import { projectPublicProgrammeMatchInput } from "../src/lib/compass-customer-gateway/public-programme-match";
import type { PublishedLenderOption } from "../src/lib/enterprise-lender-registry/published-directory";
import type { EnterpriseLenderProgramRecord } from "../src/types/enterprise-lender-registry";
import type { PartnerOpportunityDetailDto } from "../src/types/enterprise-partner-business";
import {
  PUBLIC_PROGRAMME_MATCH_EXPLANATION,
  authoritativeRequestedAmountRupees,
  projectRegistryProgrammeRecommendations,
  publicRequestedAmountLabel,
} from "../server/services/compass-customer-gateway/compass-recommendations.service";

function lender(id: string, name: string): PublishedLenderOption {
  return {
    id,
    code: id.toUpperCase(),
    displayName: name,
    legalName: name,
    institutionCategory: "bank",
    aliases: [],
    source: "api",
    published: true,
    active: true,
  };
}

function programme(id: string, lenderId: string, code: string): EnterpriseLenderProgramRecord {
  return {
    id,
    lenderId,
    productCode: "HOME_LOAN",
    code,
    enabled: true,
    isDeleted: false,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    employmentTypes: ["salaried"],
    propertyCategories: ["residential"],
    constructionStatuses: ["ready"],
    versionNumber: 3,
    policyVersionId: "policy-proof-id",
  } as EnterpriseLenderProgramRecord;
}

const detail = {
  opportunityId: "opp-proof",
  reference: "OPP-PROOF",
  customerId: "ctc-proof",
  customerDisplayName: "Proof Customer",
  ownerLabel: "",
  createdAt: new Date().toISOString(),
  productCode: "HOME_LOAN",
  productLabel: "HOME_LOAN",
  requiredAmountLabel: "₹1,00,00,000",
  borrowerFields: { employmentTypeCode: "salaried" },
  productFields: {
    requestedAmountLabel: "10000000",
    propertyCategory: "residential",
    constructionStatus: "ready",
    lendingType: "secured",
    transactionType: "fresh",
  },
} as PartnerOpportunityDetailDto;

const lenders = [lender("zeta-bank", "Zeta Bank"), lender("alpha-bank", "Alpha Bank")];
const programs = [
  programme("prog-zeta", "zeta-bank", "ZETA_HL"),
  programme("prog-alpha", "alpha-bank", "ALPHA_HL"),
];

const ranked = recommendPublishedLendersFromOptions(lenders, {
  file: buildPartnerRecommendationLoanFile(detail),
  programmes: programs,
  limit: 12,
  matchInput: projectPublicProgrammeMatchInput(detail),
});
const shown = projectRegistryProgrammeRecommendations({
  detail,
  lenders,
  programs,
  requestedAmount: 10_000_000,
});

assert.deepEqual(
  shown.cards.map((card) => card.displayName),
  ranked.map((row) => row.lenderName),
);
assert.deepEqual(
  shown.cards.map((card) => card.rank),
  ranked.map((row) => row.rank),
);
assert.equal(shown.cards.length, 2);
assert.ok(ranked.every((row) => /ZETA_HL|ALPHA_HL/.test(row.reason) && row.reason.includes("policy-proof-id")));

const label = publicRequestedAmountLabel(10_000_000);
assert.equal(label, "₹1,00,00,000");
assert.ok(shown.cards.every((card) => card.requestedAmountLabel === label));
assert.equal(publicRequestedAmountLabel("₹1,00,00,000"), null);
assert.equal(publicRequestedAmountLabel("1,00,00,000"), null);
assert.equal(publicRequestedAmountLabel("50 Lakh"), null);
assert.equal(authoritativeRequestedAmountRupees({ toNumber: () => 10_000_000 }), 10_000_000);

const absent = projectRegistryProgrammeRecommendations({
  detail,
  lenders,
  programs,
  requestedAmount: null,
});
assert.ok(absent.cards.every((card) => card.requestedAmountLabel == null));
assert.deepEqual(
  absent.cards.map((card) => card.displayName),
  shown.cards.map((card) => card.displayName),
);

for (const card of shown.cards) {
  const text = `${card.reasons.join(" ")} ${card.whyThisRecommendation ?? ""}`;
  assert.equal(text, `${PUBLIC_PROGRAMME_MATCH_EXPLANATION} ${PUBLIC_PROGRAMME_MATCH_EXPLANATION}`);
  assert.doesNotMatch(text, /ZETA_HL|ALPHA_HL|policy-proof-id|Policy /);
  assert.doesNotMatch(text, /lowest|highest|best financial|eligib/i);
}

console.log("HOME_LOAN v2.1 public card proof passed");
