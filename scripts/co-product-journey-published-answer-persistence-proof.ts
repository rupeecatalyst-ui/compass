/**
 * Published journey answer persistence.
 * File-free pure functions plus the local HOME_LOAN projection.
 * Does not open a database and does not call production.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIdcJourneyDraft, projectPublicEqualsGate } from "../server/services/compass-customer-gateway/compass-journey-config.service";
import { answersToSnapshotFields } from "../server/services/compass-customer-gateway/compass-opportunity-projection";
import { projectRegistryProgrammeRecommendations } from "../server/services/compass-customer-gateway/compass-recommendations.service";
import {
  parseCompassDisplayName,
  shouldPersistContactName,
} from "../src/lib/compass-customer-gateway/customer-identity";
import {
  quarantineInapplicableAnswers,
  recommendationReadiness,
  type PublicQuestionField,
} from "../src/lib/compass-customer-gateway/public-question-plan";
import { sanitizeCompassJourneyAnswers } from "../src/constants/compass-customer-gateway/snapshot-answers";
import type { JourneyDraft } from "../src/lib/product-journey/publication";
import type { PartnerOpportunityDetailDto } from "../src/types/enterprise-partner-business";

function questionsFrom(draft: JourneyDraft): PublicQuestionField[] {
  return draft.fields.map((field) => {
    const visible = projectPublicEqualsGate(field.visibleWhen);
    const requiredWhen = projectPublicEqualsGate(field.requiredWhen);
    return {
      fieldId: field.fieldId,
      label: field.label,
      sequence: field.sequence,
      required: field.required,
      purpose: field.purpose === "" ? undefined : field.purpose,
      visibleWhenField: visible.field,
      visibleWhenValues: visible.values,
      requiredWhenField: requiredWhen.field,
      requiredWhenValues: requiredWhen.values,
      notRequiredWhenFilled: field.notRequiredWhenFilled,
    };
  });
}

async function main() {
  const home = await buildIdcJourneyDraft("HOME_LOAN");
  const balanceTransfer = await buildIdcJourneyDraft("HOME_LOAN_BT");
  const publishedIds = home.fields.map((field) => field.fieldId);
  const questions = questionsFrom(home);
  const balanceTransferOnly = balanceTransfer.fields
    .map((field) => field.fieldId)
    .filter((fieldId) => !publishedIds.includes(fieldId));
  assert.ok(balanceTransferOnly.includes("currentLendingInstitution"));
  assert.ok(balanceTransferOnly.includes("outstandingLoanAmountLabel"));

  const submitted = {
    employmentTypeCode: "salaried",
    employerName: "STAGE1B Synthetic Employer",
    monthlyIncomeLabel: 150000,
    approxCibilScore: "750_799",
    propertyCategory: "residential",
    constructionStatus: "ready",
    requestedAmountLabel: "5000000",
    displayName: "STAGE1B E2E TEST",
    personalEmail: "stage1b.e2e.proof@example.com",
    occupation: "doctor",
    annualTurnoverLabel: "9000000",
    currentLendingInstitution: "HDFC Bank",
    outstandingLoanAmountLabel: "1000000",
    inventedField: "no",
    otpVerified: true,
    mobileVerified: true,
    advantageCommittedAmount: 999,
    sourceCode: "email_campaign",
    consentAccepted: true,
    journeyVersion: 99,
    loanAmount: 1,
  };

  const legacyIntersection = sanitizeCompassJourneyAnswers("home-loan", submitted, publishedIds);
  assert.equal(legacyIntersection.employerName, undefined);
  assert.equal(legacyIntersection.monthlyIncomeLabel, undefined);
  assert.equal(legacyIntersection.propertyCategory, undefined);
  assert.equal(legacyIntersection.requestedAmountLabel, undefined);
  assert.equal(legacyIntersection.displayName, undefined);
  assert.equal(legacyIntersection.employmentTypeCode, "salaried");
  assert.equal(legacyIntersection.approxCibilScore, "750_799");
  assert.equal(legacyIntersection.constructionStatus, "ready");

  const droppedReadiness = recommendationReadiness(questions, legacyIntersection);
  assert.equal(droppedReadiness.ready, false);
  assert.ok(droppedReadiness.missingPublicFieldKeys.includes("monthlyIncomeLabel"));
  assert.ok(droppedReadiness.missingPublicFieldKeys.includes("propertyCategory"));
  assert.ok(droppedReadiness.missingPublicFieldKeys.includes("requestedAmountLabel"));

  const accepted = sanitizeCompassJourneyAnswers("home-loan", submitted, publishedIds, "published");
  for (const key of [
    "employmentTypeCode",
    "employerName",
    "monthlyIncomeLabel",
    "approxCibilScore",
    "propertyCategory",
    "constructionStatus",
    "requestedAmountLabel",
  ]) {
    assert.equal(accepted[key], submitted[key as keyof typeof submitted], key);
  }
  assert.equal(accepted.displayName, "STAGE1B E2E TEST");
  assert.equal(accepted.personalEmail, "stage1b.e2e.proof@example.com");
  assert.equal(accepted.inventedField, undefined);
  assert.equal(accepted.currentLendingInstitution, undefined);
  assert.equal(accepted.outstandingLoanAmountLabel, undefined);
  assert.equal(accepted.otpVerified, undefined);
  assert.equal(accepted.mobileVerified, undefined);
  assert.equal(accepted.advantageCommittedAmount, undefined);
  assert.equal(accepted.sourceCode, undefined);
  assert.equal(accepted.consentAccepted, undefined);
  assert.equal(accepted.journeyVersion, undefined);
  assert.equal(accepted.loanAmount, undefined);

  const otherProduct = sanitizeCompassJourneyAnswers(
    "home-loan",
    { facilityType: "drop-line", projectCost: "100" },
    publishedIds,
    "published",
  );
  assert.deepEqual(otherProduct, {});

  const governed = quarantineInapplicableAnswers(questions, accepted);
  assert.ok(governed.removedKeys.includes("occupation"));
  assert.ok(governed.removedKeys.includes("annualTurnoverLabel"));
  assert.equal(governed.answers.occupation, undefined);
  assert.equal(governed.answers.annualTurnoverLabel, undefined);
  assert.equal(governed.answers.employerName, "STAGE1B Synthetic Employer");
  assert.equal(governed.answers.displayName, "STAGE1B E2E TEST");

  const mapped = answersToSnapshotFields(governed.answers);
  assert.equal(mapped.requestedAmount, 5000000);
  assert.equal(mapped.productFields.requestedAmountLabel, "5000000");
  assert.equal(mapped.borrowerFields.monthlyIncomeLabel, "150000");
  assert.equal(mapped.productFields.propertyCategory, "residential");
  assert.equal(mapped.borrowerFields.employmentTypeCode, "salaried");

  const ready = recommendationReadiness(questions, {
    ...governed.answers,
    loanAmount: mapped.requestedAmount,
    monthlyIncome: mapped.borrowerFields.monthlyIncomeLabel,
  });
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.missingPublicFieldKeys, []);

  const recommendation = projectRegistryProgrammeRecommendations({
    detail: {
      opportunityId: "opp-proof",
      reference: "OPP-PROOF",
      customerId: "ctc-proof",
      customerDisplayName: "STAGE1B E2E TEST",
      ownerLabel: "",
      createdAt: new Date().toISOString(),
      productCode: "HOME_LOAN",
      productLabel: "Home Loan",
      requiredAmountLabel: String(mapped.requestedAmount),
      borrowerFields: mapped.borrowerFields,
      productFields: {
        ...mapped.productFields,
        lendingType: "secured",
        transactionType: "fresh",
      },
    } as PartnerOpportunityDetailDto,
    lenders: [],
    programs: [],
  });
  assert.equal(recommendation.status, "ready");
  assert.deepEqual(recommendation.cards, []);
  assert.match(recommendation.message, /No published programme matches/);
  assert.doesNotMatch(recommendation.message, /still needed/);

  const parsedName = parseCompassDisplayName(accepted.displayName);
  assert.equal(parsedName.ok, true);
  if (parsedName.ok) {
    assert.equal(parsedName.value, "Stage1b E2e Test");
    assert.notEqual(parsedName.value, "COMPASS Prospect");
    assert.equal(shouldPersistContactName("COMPASS Prospect", parsedName.value), true);
  }

  const client = readFileSync(
    join(__dirname, "../compass/src/services/catalyst-one/client.ts"),
    "utf8",
  );
  const discovery = readFileSync(
    join(__dirname, "../compass/src/components/home-loan-experience/discovery/discovery-context.tsx"),
    "utf8",
  );
  assert.match(client, /displayName: answers\.displayName/);
  assert.match(discovery, /persistCompassAnswers\(journeySessionToken, productCode, next\)/);

  const journey = readFileSync(
    join(__dirname, "../server/services/compass-customer-gateway/compass-journey.service.ts"),
    "utf8",
  );
  const analyzeStart = journey.indexOf("async analyze(");
  const pendingAt = journey.indexOf("A few details are still needed", analyzeStart);
  const advantageAt = journey.indexOf("await persistCompassAdvantageCommitment", analyzeStart);
  assert.ok(analyzeStart > 0);
  assert.ok(pendingAt > analyzeStart);
  assert.ok(advantageAt > pendingAt);
  const commit = readFileSync(
    join(__dirname, "../server/services/compass-advantage/commit-opportunity-advantage.ts"),
    "utf8",
  );
  assert.match(commit, /advantageCommittedAmount/);
  assert.doesNotMatch(commit, /advantageCommittedAmountStore/);

  const legacy = sanitizeCompassJourneyAnswers("home-loan", {
    employmentTypeCode: "salaried",
    companyName: "Should Not Persist",
    constructionStatus: "ready",
  });
  assert.equal(legacy.employmentTypeCode, "salaried");
  assert.equal(legacy.constructionStatus, "ready");
  assert.equal(legacy.companyName, undefined);

  console.log("PUBLISHED_ANSWER_PERSISTENCE pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
