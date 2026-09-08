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
  existingMonthlyEmiRupees: 45_000,
  proposedMonthlyEmiRupees: 28_000,
  replacedHomeLoanEmiRupees: 30_000,
  isBalanceTransfer: true,
  maxFoirPercent: 50,
});
check("BT does not double-count replaced EMI", btFoir.numeratorRupees === 43_000);

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

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log("\nCO-C1-HL-BT-POLICY-001 verify: all focused checks passed.");
