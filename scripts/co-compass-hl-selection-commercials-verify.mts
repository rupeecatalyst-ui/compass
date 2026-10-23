import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitizePublicPayload } from "../src/lib/compass-customer-gateway/public-question-plan.ts";
import {
  projectPublishedProgrammeCommercials,
  validatedRequestedAmountRupees,
} from "../src/lib/compass-customer-gateway/public-programme-commercials.ts";
import {
  attachPublicSelectionIdentities,
  readCompassSelectedLenders,
  resolveCompassLenderPreferences,
  resolveCompassLenderSelection,
  type CompassSelectedLender,
} from "../src/lib/compass-customer-gateway/borrower-lender-selection.ts";

const decimal = { toNumber: () => 5_000_000 };
assert.equal(validatedRequestedAmountRupees(5_000_000), 5_000_000);
assert.equal(validatedRequestedAmountRupees("5000000"), 5_000_000);
assert.equal(validatedRequestedAmountRupees("5000000.40"), 5_000_000);
assert.equal(validatedRequestedAmountRupees(decimal), 5_000_000);
assert.equal(validatedRequestedAmountRupees("₹50,00,000"), 5_000_000);
assert.equal(validatedRequestedAmountRupees(""), null);
assert.equal(validatedRequestedAmountRupees(0), null);

const published = projectPublishedProgrammeCommercials({
  program: {
    roiPercent: 8.5,
    maxFundingAmount: 10_000_000,
    maxTenureMonths: 240,
    averageTatDays: 15,
  },
  requestedAmount: "₹50,00,000",
});
assert.equal(published.rateSource, "roiPercent");
assert.equal(published.interestRateLabel, "8.5%");
assert.equal(published.eligibleAmountSource, "published-ceiling-and-requested");
assert.equal(published.tentativeOfferRupees, 5_000_000);
assert.equal(published.tentativeOfferLabel, "₹50,00,000");
assert.equal(published.requestedAmountSource, "validated");
assert.equal(published.tenureSource, "maxTenureMonths");
assert.equal(published.tenureLabel, "240 months");
assert.equal(published.processingTimeSource, "averageTatDays");
assert.equal(published.processingTimeLabel, "15 days");
assert.equal(published.emiSource, "calculated");
assert.match(published.estimatedEmiLabel ?? "", /^₹/);

const rangeOnly = projectPublishedProgrammeCommercials({
  program: { minRoiPercent: 8.25, maxRoiPercent: 9.1, maxTenureMonths: 240, maxFundingAmount: 7_500_000 },
  requestedAmount: 6_000_000,
});
assert.equal(rangeOnly.rateSource, "roiRange");
assert.equal(rangeOnly.interestRateLabel, "8.25% – 9.1%");
assert.equal(rangeOnly.emiSource, "absent");
assert.equal(rangeOnly.estimatedEmiLabel, null);
assert.equal(rangeOnly.tentativeOfferRupees, 6_000_000);

const absent = projectPublishedProgrammeCommercials({
  program: { maxTenureMonths: 240 },
  requestedAmount: 5_000_000,
});
assert.equal(absent.rateSource, "absent");
assert.equal(absent.interestRateLabel, null);
assert.equal(absent.eligibleAmountSource, "absent");
assert.equal(absent.tentativeOfferLabel, null);
assert.equal(absent.emiSource, "absent");
assert.equal(absent.processingTimeSource, "absent");

const minOnly = projectPublishedProgrammeCommercials({
  program: { minRoiPercent: 8.75, maxTenureMonths: 180, averageTatDays: 7, maxFundingAmount: 4_000_000 },
  requestedAmount: 5_000_000,
});
assert.equal(minOnly.rateSource, "minRoiPercent");
assert.equal(minOnly.interestRateLabel, "8.75%");
assert.equal(minOnly.tentativeOfferRupees, 4_000_000);
assert.equal(minOnly.emiSource, "calculated");

const eligible = [
  {
    lenderRef: "lender:cbi",
    displayName: "Central Bank of India",
    programmeId: "prog-hl-1",
    programmeVersion: 3,
    rank: 1,
  },
];
const selected = resolveCompassLenderSelection({
  previous: null,
  submitted: {
    selectedLenderRef: "lender:cbi",
    selectedLenderName: "Central Bank of India",
    selectedProgrammeRef: "prog-hl-1",
  },
  eligible,
});
assert.deepEqual(selected, {
  lenderRef: "lender:cbi",
  lenderName: "Central Bank of India",
  programmeRef: "prog-hl-1",
  programmeVersion: 3,
  interestRateLabel: null,
  estimatedEmiLabel: null,
  tenureLabel: null,
  processingTimeLabel: null,
  tentativeOfferLabel: null,
});

assert.equal(
  resolveCompassLenderSelection({
    previous: selected,
    submitted: {
      selectedLenderRef: "lender:cbi",
      selectedLenderName: "Central Bank of India",
      selectedProgrammeRef: "prog-other",
    },
    eligible,
  })?.programmeRef,
  "prog-hl-1",
);
assert.equal(
  resolveCompassLenderSelection({
    previous: null,
    submitted: {
      selectedLenderRef: "rank:1:Central Bank of India",
      selectedLenderName: "Central Bank of India",
      selectedProgrammeRef: "prog-hl-1",
    },
    eligible,
  }),
  null,
);
assert.equal(
  resolveCompassLenderSelection({
    previous: selected,
    submitted: { loanAmount: 5000000 },
    eligible,
  })?.lenderRef,
  "lender:cbi",
);

const stripped = sanitizePublicPayload({
  cards: [{ lenderRef: "lender:cbi", programmeId: "prog-hl-1", displayName: "Central Bank of India", rank: 1 }],
  contactId: "secret",
});
assert.equal("lenderRef" in stripped.cards[0], false);
assert.equal("programmeId" in stripped.cards[0], false);
assert.equal("contactId" in stripped, false);
const restored = attachPublicSelectionIdentities(stripped.cards, eligible);
assert.equal(restored[0].lenderRef, "lender:cbi");
assert.equal(restored[0].programmeId, "prog-hl-1");

const journey = readFileSync("server/services/compass-customer-gateway/compass-journey.service.ts", "utf8");
assert.match(journey, /resolveCompassLenderPreferences/);
assert.match(journey, /attachPublicSelectionIdentities/);
assert.match(journey, /compassSelectedLender/);
assert.match(journey, /compassSelectedLenders/);
assert.doesNotMatch(journey, /enterpriseDeal\.create|prisma\.enterpriseDeal\.create/);

const ranked = [
  { ...eligible[0], rank: 2, displayName: "Central Bank of India" },
  {
    lenderRef: "lender:sbi",
    displayName: "State Bank of India",
    programmeId: "prog-sbi",
    programmeVersion: 1,
    rank: 1,
  },
  {
    lenderRef: "lender:hdfc",
    displayName: "HDFC Bank",
    programmeId: "prog-hdfc",
    programmeVersion: 4,
    rank: 3,
  },
  {
    lenderRef: "lender:axis",
    displayName: "Axis Bank",
    programmeId: "prog-axis",
    programmeVersion: 2,
    rank: 4,
  },
];
const ordered = resolveCompassLenderPreferences({
  previous: [],
  submitted: {
    selectedLenderPreferences: JSON.stringify([
      { lenderRef: "lender:hdfc", lenderName: "HDFC Bank", programmeRef: "prog-hdfc" },
      { lenderRef: "lender:cbi", lenderName: "Central Bank of India", programmeRef: "prog-hl-1" },
      { lenderRef: "lender:sbi", lenderName: "State Bank of India", programmeRef: "prog-sbi" },
      { lenderRef: "lender:axis", lenderName: "Axis Bank", programmeRef: "prog-axis" },
    ]),
  },
  eligible: ranked,
});
assert.deepEqual(ordered.map((item) => item.lenderName), ["HDFC Bank", "Central Bank of India", "State Bank of India"]);
assert.notEqual(ordered[0]?.lenderName, "State Bank of India");
const removed = resolveCompassLenderPreferences({
  previous: ordered,
  submitted: {
    selectedLenderPreferences: JSON.stringify([
      { lenderRef: "lender:cbi", lenderName: "Central Bank of India", programmeRef: "prog-hl-1" },
      { lenderRef: "lender:sbi", lenderName: "State Bank of India", programmeRef: "prog-sbi" },
    ]),
  },
  eligible: ranked,
});
assert.deepEqual(removed.map((item) => item.lenderName), ["Central Bank of India", "State Bank of India"]);
assert.deepEqual(
  resolveCompassLenderPreferences({
    previous: ordered,
    submitted: { loanAmount: 5000000 },
    eligible: ranked,
  }).map((item) => item.lenderRef),
  ordered.map((item) => item.lenderRef),
);
assert.deepEqual(
  resolveCompassLenderPreferences({
    previous: ordered,
    submitted: { selectedLenderPreferences: "[]" },
    eligible: ranked,
  }),
  [],
);
const legacySnapshot = {
  compassSelectedLender: {
    lenderRef: "lender:cbi",
    lenderName: "Central Bank of India",
    programmeRef: "prog-hl-1",
    programmeVersion: 3,
  },
};
assert.equal(readCompassSelectedLenders(legacySnapshot).length, 1);
assert.equal(readCompassSelectedLenders(legacySnapshot)[0]?.lenderName, "Central Bank of India");
const serialize = readFileSync("server/services/enterprise-opportunity/opportunity-serialize.ts", "utf8");
assert.match(serialize, /compassSelectedLender: readCompassSelectedLender/);
const overview = readFileSync(
  "src/components/catalyst-one/opportunity-workspace/workspace-overview-panel.tsx",
  "utf8",
);
assert.match(overview, /Borrower selection/);

const stored: CompassSelectedLender | null = selected;
assert.equal(stored?.lenderName, "Central Bank of India");

console.log("co-compass-hl-selection-commercials-verify: pass");
