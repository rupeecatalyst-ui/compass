/**
 * CO-C1-HL-BT-POLICY-001 — focused calculation and architecture gates.
 * Does not activate lender programmes or seed production policy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateRegulatoryMaxLoanAmount, applyStricterLenderLtvCap } from "../src/lib/home-loan-recommendation/rbi-ltv.ts";
import { calculateSalariedFoir } from "../src/lib/home-loan-recommendation/foir.ts";
import { applyCibilCategoryGate } from "../src/lib/home-loan-recommendation/cibil-category.ts";
import { calculateTentativeOffer } from "../src/lib/home-loan-recommendation/tentative-offer.ts";
import { calculateEffectiveTenureMonths, calculateReducingBalanceEmi } from "../src/lib/home-loan-recommendation/tenure.ts";
import {
  addWorkingMinutes,
  borrowerSlaCopy,
  calculateOneWorkingHourSla,
} from "../src/lib/home-loan-recommendation/working-hour-sla.ts";
import { runHomeLoanRecommendationEngine } from "../src/lib/home-loan-recommendation/engine.ts";
import {
  parseCertaintyAmount,
  parseRateType,
  evaluateProgrammeSeasoning,
  calculateIndicativeBtSaving,
  shouldAskOriginalTenure,
  shouldAskDelayedEmiCount,
  shouldAskTopUpAmount,
  shouldAskTopUpPurpose,
  shouldAskRegistrationStatus,
} from "../src/lib/home-loan-recommendation/bt-journey.ts";
import { buildBtAssessmentDisplay } from "../src/lib/home-loan-recommendation/bt-assessment-display.ts";
import {
  journeyKindFromProduct,
  customerInputFromCompassAnswers,
} from "../src/lib/home-loan-recommendation/compass-answers.ts";
import {
  getDiscoveryStepOrder,
  shouldShowDiscoveryStep,
} from "../compass/src/config/compass-lending-products.ts";
import { compassPersistedAnswerKeys } from "../src/constants/compass-customer-gateway/snapshot-answers.ts";
import { isProgrammeAvailableForPublicRecommendation } from "../src/lib/home-loan-recommendation/programme-gate.ts";
import { compassOtpUiEnabled, readCompassOtpConfig } from "../src/lib/compass-otp/adapter.ts";
import { OPPORTUNITY_LIFECYCLE } from "../src/constants/opportunity-lifecycle.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function pass(name) {
  console.log(`PASS  ${name}`);
}
function check(name, condition) {
  if (condition) pass(name);
  else {
    failed += 1;
    console.log(`FAIL  ${name}`);
  }
}

const calendar = {
  timeZone: "Asia/Kolkata",
  workingDays: [1, 2, 3, 4, 5],
  workingHours: { openMinutes: 10 * 60, closeMinutes: 19 * 60 },
  holidays: ["2026-09-11"],
  versionNumber: 1,
};

check("₹30L property → ₹27L", calculateRegulatoryMaxLoanAmount({ propertyValueRupees: 30_00_000 }).maxValidLoanAmountRupees === 27_00_000);
check("₹50L property → ₹40L", calculateRegulatoryMaxLoanAmount({ propertyValueRupees: 50_00_000 }).maxValidLoanAmountRupees === 40_00_000);
check("₹75L property → ₹60L", calculateRegulatoryMaxLoanAmount({ propertyValueRupees: 75_00_000 }).maxValidLoanAmountRupees === 60_00_000);
check("₹1Cr property → ₹75L", calculateRegulatoryMaxLoanAmount({ propertyValueRupees: 1_00_00_000 }).maxValidLoanAmountRupees === 75_00_000);
check("₹2Cr property → ₹1.50Cr", calculateRegulatoryMaxLoanAmount({ propertyValueRupees: 2_00_00_000 }).maxValidLoanAmountRupees === 1_50_00_000);

const belowCap = calculateTentativeOffer({
  requiredAmountRupees: 20_00_000,
  ltvSupportedAmountRupees: 40_00_000,
  incomeSupportedAmountRupees: 50_00_000,
  programmeMaxAmountRupees: 80_00_000,
});
check("requested below cap uses requested", belowCap.tentativeOfferRupees === 20_00_000);

const aboveCap = calculateTentativeOffer({
  requiredAmountRupees: 70_00_000,
  ltvSupportedAmountRupees: 40_00_000,
  incomeSupportedAmountRupees: 90_00_000,
  programmeMaxAmountRupees: 80_00_000,
});
check("requested above cap uses LTV", aboveCap.tentativeOfferRupees === 40_00_000 && aboveCap.shortfallRupees === 30_00_000);

const stricter = applyStricterLenderLtvCap({
  regulatoryMaxRupees: 40_00_000,
  propertyValueRupees: 50_00_000,
  lenderMaxLtvPercent: 70,
});
check("stricter lender LTV wins", stricter.amountRupees === 35_00_000 && stricter.capSource === "lender");

const slabBoundary = calculateRegulatoryMaxLoanAmount({ propertyValueRupees: 33_34_000 });
check("30L loan slab boundary does not naively apply 90% above slab", slabBoundary.maxValidLoanAmountRupees <= 30_00_000 || slabBoundary.appliedLtvPercent <= 90);

const foir = calculateSalariedFoir({
  eligibleMonthlyIncomeRupees: 1_00_000,
  existingMonthlyEmiRupees: 20_000,
  proposedMonthlyEmiRupees: 30_000,
  maxFoirPercent: 50,
});
check("existing EMIs included in FOIR", foir.foirPercent === 50);

const btFoir = calculateSalariedFoir({
  eligibleMonthlyIncomeRupees: 1_00_000,
  existingMonthlyEmiRupees: 15_000,
  proposedMonthlyEmiRupees: 28_000,
  replacedHomeLoanEmiRupees: 30_000,
  isBalanceTransfer: true,
  maxFoirPercent: 50,
});
check("BT does not double-count replaced EMI", btFoir.numeratorRupees === 43_000);
check("BT comparison EMI is not added to FOIR", btFoir.numeratorRupees !== 15_000 + 30_000 + 28_000);

check("CIBIL not known → A only", applyCibilCategoryGate({ cibilBandOrScore: "not_known" }).permittedCategories.join() === "A");
check("CIBIL below 700 → C only", applyCibilCategoryGate({ cibilBandOrScore: 650 }).permittedCategories.join() === "C");
check("CIBIL 700 → A,B,C", applyCibilCategoryGate({ cibilBandOrScore: 700 }).permittedCategories.join() === "A,B,C");

check(
  "unpublished programme excluded",
  isProgrammeAvailableForPublicRecommendation({
    enabled: true,
    isLivePublished: false,
    publicationState: "draft",
    completenessState: "incomplete",
  }).passed === false,
);

const ageTenure = calculateEffectiveTenureMonths({
  programmeMaxTenureMonths: 360,
  maxAgeAtMaturityYears: 60,
  applicantAgeMonths: 45 * 12,
  ageGoverningParty: "applicant",
});
check("age reduces tenure", ageTenure.effectiveTenureMonths === 180);
check("maturity label is not automatic qualification", ageTenure.ageAtMaturityYearsLabel === "Maximum permitted age at loan maturity: 60 years");

const emiA = calculateReducingBalanceEmi({ principalRupees: 50_00_000, annualRoiPercent: 8.5, tenureMonths: 360 });
const emiB = calculateReducingBalanceEmi({ principalRupees: 50_00_000, annualRoiPercent: 9.5, tenureMonths: 240 });
check("different lender ROI/tenure produce different EMI", emiA != null && emiB != null && emiA !== emiB);

const emptyEngine = runHomeLoanRecommendationEngine({
  customer: {
    journeyKind: "home_loan",
    requiredAmountRupees: 50_00_000,
    propertyValueRupees: 80_00_000,
    employmentFamily: "salaried",
    monthlyIncomeRupees: 1_20_000,
    existingMonthlyEmiRupees: 10_000,
    cibilBand: "not_known",
  },
  programmes: [],
});
check("no programmes → Assisted Offer", emptyEngine.outcome === "assisted_offer" && emptyEngine.cards.length === 0);
check("Assisted Offer copy present", Boolean(emptyEngine.assisted?.headline));

const selfEmployed = runHomeLoanRecommendationEngine({
  customer: {
    journeyKind: "home_loan",
    requiredAmountRupees: 40_00_000,
    propertyValueRupees: 60_00_000,
    employmentFamily: "self_employed",
    cibilBand: 750,
  },
  programmes: [
    {
      id: "p1",
      lenderId: "l1",
      code: "HL",
      label: "Demo",
      versionNumber: 1,
      enabled: true,
      isLivePublished: true,
      publicationState: "published",
      completenessState: "complete",
      lenderCategory: "A",
      selfEmployedMethodologyPresent: false,
      maxTenureMonths: 240,
      maxLoanAmountExact: 80_00_000,
    },
  ],
});
check("self-employed without programme method is not a salaried FOIR reject", selfEmployed.outcome === "assisted_offer");

const coAppPrompt = runHomeLoanRecommendationEngine({
  customer: {
    journeyKind: "home_loan",
    requiredAmountRupees: 80_00_000,
    propertyValueRupees: 1_00_00_000,
    employmentFamily: "salaried",
    monthlyIncomeRupees: 40_000,
    existingMonthlyEmiRupees: 25_000,
    dateOfBirth: "1985-01-15",
    cibilBand: 760,
  },
  programmes: [
    {
      id: "p2",
      lenderId: "l2",
      code: "HL2",
      label: "Fit",
      versionNumber: 1,
      enabled: true,
      isLivePublished: true,
      publicationState: "published",
      completenessState: "complete",
      lenderCategory: "A",
      maxTenureMonths: 360,
      maxAgeAtMaturityYears: 70,
      minRoiExact: 8.5,
      maxFoirPercent: 50,
      maxLoanAmountExact: 1_00_00_000,
      maxLtvPercent: 80,
      acceptsCoApplicantIncome: true,
      selfEmployedMethodologyPresent: false,
    },
  ],
});
check("co-applicant asked only when salaried assessment cannot support request", coAppPrompt.needsCoApplicantPrompt === true);

const qualifies = runHomeLoanRecommendationEngine({
  customer: {
    journeyKind: "home_loan",
    requiredAmountRupees: 20_00_000,
    propertyValueRupees: 50_00_000,
    employmentFamily: "salaried",
    monthlyIncomeRupees: 2_50_000,
    existingMonthlyEmiRupees: 5_000,
    dateOfBirth: "1990-06-01",
    cibilBand: 780,
  },
  programmes: [
    {
      id: "p3",
      lenderId: "l3",
      code: "HL3",
      label: "Qualify",
      versionNumber: 1,
      enabled: true,
      isLivePublished: true,
      publicationState: "published",
      completenessState: "complete",
      lenderCategory: "A",
      maxTenureMonths: 360,
      maxAgeAtMaturityYears: 70,
      minRoiExact: 8.4,
      maxFoirPercent: 60,
      maxLoanAmountExact: 90_00_000,
      maxLtvPercent: 80,
    },
  ],
});
check("co-applicant not shown when applicant qualifies", qualifies.needsCoApplicantPrompt === false && qualifies.outcome === "lender_offers");

const unclassified = runHomeLoanRecommendationEngine({
  customer: {
    journeyKind: "home_loan",
    requiredAmountRupees: 20_00_000,
    propertyValueRupees: 50_00_000,
    employmentFamily: "salaried",
    monthlyIncomeRupees: 2_50_000,
    existingMonthlyEmiRupees: 0,
    cibilBand: 780,
    dateOfBirth: "1990-06-01",
  },
  programmes: [
    {
      id: "p4",
      lenderId: "l4",
      code: "HL4",
      label: "No category",
      versionNumber: 1,
      enabled: true,
      isLivePublished: true,
      publicationState: "published",
      completenessState: "complete",
      lenderCategory: null,
      maxTenureMonths: 360,
      minRoiExact: 8,
      maxFoirPercent: 60,
      maxLoanAmountExact: 90_00_000,
    },
  ],
});
check("unclassified lender excluded from public cards", unclassified.cards.length === 0);

const weekdayOpen = new Date("2026-09-08T05:00:00.000Z");
const slaOpen = calculateOneWorkingHourSla({ requestedAt: weekdayOpen, calendar, now: weekdayOpen });
check("during working hours SLA starts immediately", slaOpen.queuedUntilOpen === false);

const saturday = new Date("2026-09-12T08:00:00.000Z");
const slaWeekend = calculateOneWorkingHourSla({ requestedAt: saturday, calendar, now: saturday });
check("weekend queues until reopen", slaWeekend.queuedUntilOpen === true);

const holiday = new Date("2026-09-11T05:30:00.000Z");
const slaHoliday = calculateOneWorkingHourSla({ requestedAt: holiday, calendar, now: holiday });
check("organisation holiday queues", slaHoliday.queuedUntilOpen === true);

const nearClose = new Date("2026-09-08T13:00:00.000Z");
const deadlineNearClose = addWorkingMinutes(nearClose, 60, calendar);
check("near closing spans to next working open", deadlineNearClose.getTime() > nearClose.getTime());

check("borrower never sees SLA Breached", borrowerSlaCopy("sla_breached", false).includes("prioritised"));
check("canonical initial Opportunity stage is dialogue", OPPORTUNITY_LIFECYCLE.DIALOGUE === "dialogue");

const otp = readCompassOtpConfig();
check("OTP delivery disabled without provider/DLT", otp.deliveryEnabled === false);
check("OTP UI follows deliveryEnabled", compassOtpUiEnabled() === otp.deliveryEnabled);

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
check("Deal lenderProgramId stamp field unchanged in schema", schema.includes("lenderProgramId"));
check("additive CompassHomeLoanAssessment model", schema.includes("model CompassHomeLoanAssessment"));
check("no new Opportunity lifecycle enum value invented", !schema.includes("compass_lead") && !schema.includes("assisted_offer_stage"));

const migration = fs.readFileSync(
  path.join(root, "prisma/migrations/20260908180000_co_c1_hl_bt_policy_recommendation_001/migration.sql"),
  "utf8",
);
check("migration is additive", migration.includes("ADD COLUMN IF NOT EXISTS") || migration.includes("CREATE TABLE IF NOT EXISTS"));
check("migration does not rewrite Deal stamps", !/UPDATE\s+"enterprise_deals"/i.test(migration));
check("migration does not seed live categories", !migration.toLowerCase().includes("insert into \"hl_recommendation_lender_categories\""));

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
check("verify script registered", Boolean(pkg.scripts["verify:co-c1-hl-bt-policy-recommendation-001"]));

const unknownAmount = parseCertaintyAmount("", "not_known");
check("not known amount stays null, not zero", unknownAmount.valueRupees === null && unknownAmount.certainty === "not_known");
check("exact amount is preserved", parseCertaintyAmount(50_00_000, "exact").valueRupees === 50_00_000);
check("approximate amount is preserved", parseCertaintyAmount("2500000", "approximate").valueRupees === 25_00_000);
check("rate types include hybrid and not known", parseRateType("hybrid") === "hybrid" && parseRateType("not_known") === "not_known" && parseRateType("floating") === "floating" && parseRateType("fixed") === "fixed");

const missingStart = evaluateProgrammeSeasoning({
  loanStartIsoDate: null,
  loanStartCertainty: "not_known",
  requiredSeasoningMonths: 12,
  now: new Date("2026-09-08T00:00:00.000Z"),
});
check("missing start date does not assume universal seasoning fail", missingStart.status === "unknown");
check("no programme seasoning is not applicable", evaluateProgrammeSeasoning({
  loanStartIsoDate: "2024-01-01",
  requiredSeasoningMonths: null,
}).status === "not_applicable");
check("programme seasoning met when months suffice", evaluateProgrammeSeasoning({
  loanStartIsoDate: "2024-01-01",
  requiredSeasoningMonths: 12,
  now: new Date("2026-09-08T00:00:00.000Z"),
}).status === "met");
check("programme seasoning not met when too recent", evaluateProgrammeSeasoning({
  loanStartIsoDate: "2026-08-01",
  requiredSeasoningMonths: 12,
  now: new Date("2026-09-08T00:00:00.000Z"),
}).status === "not_met");

const suppressedSaving = calculateIndicativeBtSaving({
  currentEmiRupees: null,
  currentEmiCertainty: "not_known",
  remainingTenureMonths: 180,
  currentRoiPercent: 9.5,
  proposedEmiRupees: 40_000,
});
check("savings suppressed when EMI unknown", suppressedSaving.suppressed === true && suppressedSaving.indicativeSavingRupees === null);
check("savings suppressed when start/tenure missing", calculateIndicativeBtSaving({
  currentEmiRupees: 45_000,
  remainingTenureMonths: null,
  remainingTenureCertainty: "not_known",
  currentRoiPercent: 9,
  proposedEmiRupees: 40_000,
}).suppressed === true);
check("savings calculated only with complete inputs", calculateIndicativeBtSaving({
  currentEmiRupees: 45_000,
  remainingTenureMonths: 120,
  currentRoiPercent: 9.5,
  proposedEmiRupees: 40_000,
}).indicativeSavingRupees === 5_000 * 120);

check("original tenure asked only when remaining unknown", shouldAskOriginalTenure({ remainingTenureMonths: null, remainingTenureCertainty: "not_known" }) === true);
check("original tenure skipped when remaining known", shouldAskOriginalTenure({ remainingTenureMonths: 180, remainingTenureCertainty: "exact" }) === false);
check("delayed EMI count only if track is not clean", shouldAskDelayedEmiCount("no") === true && shouldAskDelayedEmiCount("yes") === false);
check("top-up amount only for BT with top-up", shouldAskTopUpAmount("with_topup") === true && shouldAskTopUpAmount("bt_only") === false);
check("top-up purpose hidden without programme requirement", shouldAskTopUpPurpose({ topUpChoice: "with_topup", programmeRequiresTopUpPurpose: false }) === false);
check("top-up purpose shown only when programme requires it", shouldAskTopUpPurpose({ topUpChoice: "with_topup", programmeRequiresTopUpPurpose: true }) === true);
check("registration asked for possessed or ready", shouldAskRegistrationStatus({ possessionStatus: "possessed" }) === true && shouldAskRegistrationStatus({ constructionStatus: "ready" }) === true);
check("registration skipped for under construction", shouldAskRegistrationStatus({ constructionStatus: "under_construction" }) === false);

check("BT only journey kind", journeyKindFromProduct("home-loan-balance-transfer", { topUpChoice: "bt_only" }) === "home_loan_balance_transfer");
check("BT with top-up journey kind", journeyKindFromProduct("home-loan-balance-transfer", { topUpChoice: "with_topup" }) === "home_loan_balance_transfer_topup");
check("leftover top-up amount does not switch journey kind", journeyKindFromProduct("home-loan-balance-transfer", { topUpAmount: 5_00_000 }) === "home_loan_balance_transfer");

const btOnlyInput = customerInputFromCompassAnswers("home-loan-balance-transfer", {
  topUpChoice: "bt_only",
  outstandingLoanAmount: 40_00_000,
  outstandingCertainty: "exact",
  currentEmi: 35_000,
  currentEmiCertainty: "exact",
  existingEmi: 8_000,
  rateType: "floating",
});
check("BT only required amount is outstanding", btOnlyInput.requiredAmountRupees === 40_00_000 && btOnlyInput.topUpAmountRupees == null);
check("unknown outstanding is not coerced to zero", customerInputFromCompassAnswers("home-loan-balance-transfer", {
  outstandingLoanAmount: 0,
  outstandingCertainty: "not_known",
}).currentOutstandingRupees === null);

const btTopUpInput = customerInputFromCompassAnswers("home-loan-balance-transfer", {
  topUpChoice: "with_topup",
  outstandingLoanAmount: 40_00_000,
  outstandingCertainty: "approximate",
  topUpAmount: 10_00_000,
  topUpAmountCertainty: "exact",
});
check("BT with top-up keeps both components", btTopUpInput.journeyKind === "home_loan_balance_transfer_topup" && btTopUpInput.topUpAmountRupees === 10_00_000);

const emptyBt = runHomeLoanRecommendationEngine({
  customer: {
    journeyKind: "home_loan_balance_transfer",
    requiredAmountRupees: 40_00_000,
    propertyValueRupees: 80_00_000,
    employmentFamily: "salaried",
    monthlyIncomeRupees: 1_20_000,
    existingMonthlyEmiRupees: 10_000,
    currentHomeLoanEmiRupees: 32_000,
    cibilBand: 760,
  },
  programmes: [],
});
check("no active programme → Assisted Balance Transfer Offer", emptyBt.outcome === "assisted_offer" && emptyBt.assisted?.headline === "Assisted Balance Transfer Offer");

const seasoningUnknown = runHomeLoanRecommendationEngine({
  customer: {
    journeyKind: "home_loan_balance_transfer",
    requiredAmountRupees: 20_00_000,
    propertyValueRupees: 50_00_000,
    employmentFamily: "salaried",
    monthlyIncomeRupees: 2_50_000,
    existingMonthlyEmiRupees: 5_000,
    dateOfBirth: "1990-06-01",
    cibilBand: 780,
    loanStartDate: null,
    loanStartDateCertainty: "not_known",
  },
  programmes: [
    {
      id: "p-season",
      lenderId: "l-season",
      code: "HLBT",
      label: "Seasoned",
      versionNumber: 1,
      enabled: true,
      isLivePublished: true,
      publicationState: "published",
      completenessState: "complete",
      lenderCategory: "A",
      maxTenureMonths: 360,
      maxAgeAtMaturityYears: 70,
      minRoiExact: 8.4,
      maxFoirPercent: 60,
      maxLoanAmountExact: 90_00_000,
      maxLtvPercent: 80,
      requiredSeasoningMonths: 12,
    },
  ],
});
check("missing start date with programme seasoning does not fabricate a public card", seasoningUnknown.cards.length === 0 && seasoningUnknown.outcome === "assisted_offer");

const btStepOrder = getDiscoveryStepOrder("home-loan-balance-transfer");
check("current lender is asked before top-up choice", btStepOrder.indexOf("currentLender") < btStepOrder.indexOf("topUpChoice"));
check("top-up amount follows BT vs top-up choice", btStepOrder.indexOf("topUpChoice") < btStepOrder.indexOf("topUpAmount"));
check("name is after property questions, not with mobile/email", btStepOrder.indexOf("displayName") > btStepOrder.indexOf("registrationStatus") && btStepOrder.indexOf("displayName") < btStepOrder.indexOf("mobile"));
check("mobile is before income", btStepOrder.indexOf("mobile") < btStepOrder.indexOf("monthlyIncome"));
check("email remains at the end of identity", btStepOrder.indexOf("email") > btStepOrder.indexOf("lenders"));
check("conditional top-up amount hidden for BT only", shouldShowDiscoveryStep("topUpAmount", { topUpChoice: "bt_only" }, "home-loan-balance-transfer") === false);
check("conditional top-up amount shown with top-up", shouldShowDiscoveryStep("topUpAmount", { topUpChoice: "with_topup" }, "home-loan-balance-transfer") === true);
check("top-up purpose stays hidden without programmes", shouldShowDiscoveryStep("topUpPurpose", { topUpChoice: "with_topup" }, "home-loan-balance-transfer") === false);
check("delayed EMI hidden on clean track", shouldShowDiscoveryStep("delayedEmiCount", { repaymentTrack: "yes" }, "home-loan-balance-transfer") === false);
check("delayed EMI shown when not clean", shouldShowDiscoveryStep("delayedEmiCount", { repaymentTrack: "no" }, "home-loan-balance-transfer") === true);
check("original tenure shown when remaining unknown", shouldShowDiscoveryStep("originalTenureMonths", { remainingTenureCertainty: "not_known" }, "home-loan-balance-transfer") === true);
check("registration shown for possessed property", shouldShowDiscoveryStep("registrationStatus", { possessionStatus: "possessed" }, "home-loan-balance-transfer") === true);

const displayBtOnly = buildBtAssessmentDisplay({
  currentLender: "HDFC",
  originalSanctionedAmount: 50_00_000,
  originalSanctionedCertainty: "exact",
  outstandingLoanAmount: 38_00_000,
  outstandingCertainty: "approximate",
  loanStartDate: "2019-04-01",
  currentRoi: 9.15,
  currentRoiCertainty: "exact",
  rateType: "floating",
  currentEmi: 42_000,
  currentEmiCertainty: "exact",
  remainingTenureMonths: 168,
  remainingTenureCertainty: "exact",
  repaymentTrack: "yes",
  propertyValue: 90_00_000,
  propertyValueCertainty: "approximate",
  city: "Pune",
  pincode: "411001",
  propertyKind: "apartment",
  constructionStatus: "ready",
  occupancy: "self-occupied",
  possessionStatus: "possessed",
  registrationStatus: "registered",
  topUpChoice: "bt_only",
  existingEmi: 8_000,
});
check("Opportunity assessment has Existing Loan facts", displayBtOnly.existingLoan.some((row) => row.label === "Current lender" && row.value.includes("HDFC")));
check("Opportunity assessment has Property facts", displayBtOnly.property.some((row) => row.label === "Property type" && row.value.includes("apartment")));
check("Opportunity assessment has Repayment Conduct", displayBtOnly.repaymentConduct.some((row) => row.label.includes("On-time")));
check("BT only does not invent a top-up amount", displayBtOnly.topUpRequirement.some((row) => row.value === "Balance Transfer only"));
check("Calculation Inputs preserve comparison EMI", displayBtOnly.calculationInputs.some((row) => row.label.includes("comparison") && row.value.includes("42,000")));
check("Assessment is not a raw JSON dump", Array.isArray(displayBtOnly.existingLoan) && Array.isArray(displayBtOnly.missingInformation));

const displayUnknown = buildBtAssessmentDisplay({
  currentLender: "not_known",
  outstandingCertainty: "not_known",
  currentRoiCertainty: "not_known",
  rateType: "hybrid",
  repaymentTrack: "no",
  delayedEmiCount: 2,
  topUpChoice: "with_topup",
  topUpAmountCertainty: "not_known",
  propertyKind: "independent_house",
  constructionStatus: "under_construction",
  possessionStatus: "not_possessed",
});
check("unknown values render as not known, not zero", displayUnknown.existingLoan.some((row) => row.label === "Current ROI" && row.value === "Not known"));
check("hybrid rate type is displayed", displayUnknown.existingLoan.some((row) => row.label === "Interest-rate type" && row.value === "Hybrid"));
check("delayed repayment branch is shown", displayUnknown.repaymentConduct.some((row) => row.label.includes("Delayed") && row.value === "2"));
check("conditional top-up amount stays unknown", displayUnknown.topUpRequirement.some((row) => row.label.includes("top-up amount") && row.value === "Not known"));
check("missing information list is populated", displayUnknown.missingInformation.length > 0);

const persisted = compassPersistedAnswerKeys("home-loan-balance-transfer");
check("persistence includes BT certainty keys", persisted.has("rateType") && persisted.has("loanStartDate") && persisted.has("originalDeclared") === false);
check("original customer response keys are persisted separately from derived display", persisted.has("originalSanctionedAmount") && persisted.has("possessionStatus"));

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log("\nCO-C1-HL-BT-POLICY-001 verify: all focused checks passed.");
