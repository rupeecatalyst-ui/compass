/**
 * Customer COMPASS lender order. No database.
 * Eligibility and the shared registry ranker stay in place.
 * The customer list orders eligible lenders by Minimum ROI, then name.
 */
import assert from "node:assert/strict";
import { recommendPublishedLendersFromOptions } from "../src/lib/enterprise-lender-registry/recommend-from-registry";
import { buildPartnerRecommendationLoanFile } from "../src/lib/enterprise-partner-recommendations/project";
import { projectPublicProgrammeMatchInput } from "../src/lib/compass-customer-gateway/public-programme-match";
import type { PublishedLenderOption } from "../src/lib/enterprise-lender-registry/published-directory";
import type { EnterpriseLenderProgramRecord } from "../src/types/enterprise-lender-registry";
import type { PartnerOpportunityDetailDto } from "../src/types/enterprise-partner-business";
import { projectRegistryProgrammeRecommendations } from "../server/services/compass-customer-gateway/compass-recommendations.service";

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

function programme(
  id: string,
  lenderId: string,
  patch: Partial<EnterpriseLenderProgramRecord> = {},
): EnterpriseLenderProgramRecord {
  return {
    id,
    organizationId: "org-proof",
    lenderId,
    productCode: "HOME_LOAN",
    code: id,
    label: id,
    enabled: true,
    isDeleted: false,
    isLivePublished: true,
    publicationState: "published",
    status: "active",
    lifecycleStatus: "active",
    completenessState: "complete",
    employmentType: "salaried",
    employmentTypes: ["salaried"],
    propertyCategories: ["residential"],
    constructionStatuses: ["ready"],
    versionNumber: 4,
    policyVersionId: "policy-proof-id",
    ...patch,
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
  requiredAmountLabel: "5000000",
  borrowerFields: { employmentTypeCode: "salaried" },
  productFields: {
    requestedAmountLabel: "5000000",
    propertyCategory: "residential",
    constructionStatus: "ready",
    lendingType: "secured",
    transactionType: "fresh",
  },
} as PartnerOpportunityDetailDto;

const lenders = [lender("alpha-bank", "Alpha Bank"), lender("zeta-bank", "Zeta Bank")];
const programs = [
  programme("alpha-current", "alpha-bank", {
    minRoiExact: "7.40",
    maxRoiExact: "8.10",
    roiPercent: 7.1,
    versionNumber: 4,
  }),
  programme("zeta-current", "zeta-bank", {
    minRoiExact: "7.10",
    maxRoiExact: "8.50",
    roiPercent: 9,
    versionNumber: 6,
  }),
  programme("zeta-old", "zeta-bank", {
    minRoiExact: "6.50",
    publicationState: "superseded",
    isLivePublished: false,
    versionNumber: 5,
  }),
];

const registryOrder = recommendPublishedLendersFromOptions(lenders, {
  file: buildPartnerRecommendationLoanFile(detail),
  programmes: programs,
  limit: 12,
  matchInput: projectPublicProgrammeMatchInput(detail),
});
assert.deepEqual(
  registryOrder.map((row) => row.lenderName),
  ["Alpha Bank", "Zeta Bank"],
);

const shown = projectRegistryProgrammeRecommendations({
  detail,
  lenders,
  programs,
  requestedAmount: 5_000_000,
});
assert.deepEqual(
  shown.cards.map((card) => card.displayName),
  ["Zeta Bank", "Alpha Bank"],
);
assert.deepEqual(
  shown.cards.map((card) => card.rank),
  [1, 2],
);
assert.equal(shown.cards[0]?.programmeId, "zeta-current");
assert.equal(shown.cards[0]?.programmeVersion, 6);
assert.equal(shown.cards[0]?.interestRateLabel, "Indicative 7.10% – 8.50%");
assert.equal(shown.cards[1]?.interestRateLabel, "Indicative 7.40% – 8.10%");
assert.equal(shown.cards[0]?.tier, "best");

const sameRate = projectRegistryProgrammeRecommendations({
  detail,
  lenders,
  programs: [
    programme("zeta-tie", "zeta-bank", { minRoiExact: "7.25", maxRoiExact: "7.25" }),
    programme("alpha-tie", "alpha-bank", { minRoiExact: "7.25", roiPercent: 6 }),
  ],
  requestedAmount: 5_000_000,
});
assert.deepEqual(
  sameRate.cards.map((card) => card.displayName),
  ["Alpha Bank", "Zeta Bank"],
);
assert.equal(sameRate.cards[0]?.interestRateLabel, "Indicative 7.25%");

const commercial = projectRegistryProgrammeRecommendations({
  detail: {
    ...detail,
    productFields: { ...detail.productFields, propertyCategory: "commercial" },
  },
  lenders,
  programs,
  requestedAmount: 5_000_000,
});
assert.equal(commercial.cards.length, 0);

const duplicated = projectRegistryProgrammeRecommendations({
  detail,
  lenders: [lender("alpha-bank", "Alpha Bank")],
  programs: [
    programme("alpha-a", "alpha-bank", { minRoiExact: "7.10" }),
    programme("alpha-b", "alpha-bank", { minRoiExact: "7.25" }),
  ],
  requestedAmount: 5_000_000,
});
assert.equal(duplicated.cards.length, 0);

console.log("customer compass minimum-roi order passed");
