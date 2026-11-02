/**
 * Ordinary COMPASS answer saves skip the lender-programme catalogue.
 * Explicit preferences still validate against it. No database.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  resolveAnswerSaveLenderSelection,
  type CompassSelectedLender,
  type EligiblePublishedMatch,
} from "../src/lib/compass-customer-gateway/borrower-lender-selection";

const stored: CompassSelectedLender = {
  lenderRef: "lender-stored",
  lenderName: "Stored Lender",
  programmeRef: "programme-stored",
  programmeVersion: 3,
  interestRateLabel: "Indicative 7.40%",
  estimatedEmiLabel: null,
  tenureLabel: null,
  processingTimeLabel: null,
  tentativeOfferLabel: null,
};

const published: EligiblePublishedMatch = {
  lenderRef: "lender-published",
  displayName: "Published Lender",
  programmeId: "programme-published",
  programmeVersion: 8,
  interestRateLabel: "Indicative 7.25%",
  estimatedEmiLabel: "₹41,000",
  tenureLabel: null,
  processingTimeLabel: "14 days",
  tentativeOfferLabel: null,
};

const snapshot = {
  compassSelectedLender: stored,
  compassSelectedLenders: [stored],
  compassAnswers: { displayName: "Asha Rao" },
};

const homeLoanAnswers = {
  displayName: "Asha Rao",
  employmentTypeCode: "salaried",
  requestedAmountLabel: "5000000",
  personalEmail: "asha@example.com",
};

const balanceTransferAnswers = {
  displayName: "Asha Rao",
  currentLender: "Stored Lender",
  outstandingLoanAmount: "3200000",
  requestedAmountLabel: "3200000",
};

function explicitSingle(match: EligiblePublishedMatch) {
  return {
    selectedLenderRef: match.lenderRef,
    selectedLenderName: match.displayName,
    selectedProgrammeRef: String(match.programmeId),
  };
}

async function measure(
  label: string,
  run: (load: () => Promise<readonly EligiblePublishedMatch[]>) => Promise<void>,
  options: { delayMs: number; fail?: boolean },
) {
  let calls = 0;
  const started = performance.now();
  await run(async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    if (options.fail) throw new Error("catalogue unavailable");
    return [published];
  });
  return { label, calls, elapsedMs: Math.round(performance.now() - started) };
}

async function run() {
  const untouched = structuredClone(snapshot);

  const absent = await resolveAnswerSaveLenderSelection({
    snapshot,
    submitted: homeLoanAnswers,
    loadEligible: async () => {
      throw new Error("ordinary answer save must not load the catalogue");
    },
  });
  assert.deepEqual(absent, [stored]);
  assert.deepEqual(snapshot, untouched);

  const transfer = await resolveAnswerSaveLenderSelection({
    snapshot,
    submitted: balanceTransferAnswers,
    loadEligible: async () => {
      throw new Error("balance transfer answer save must not load the catalogue");
    },
  });
  assert.deepEqual(transfer, [stored]);

  let explicitCalls = 0;
  const selected = await resolveAnswerSaveLenderSelection({
    snapshot,
    submitted: explicitSingle(published),
    loadEligible: async () => {
      explicitCalls += 1;
      return [published];
    },
  });
  assert.equal(explicitCalls, 1);
  assert.equal(selected[0]?.lenderRef, "lender-published");
  assert.equal(selected[0]?.programmeRef, "programme-published");
  assert.equal(selected[0]?.interestRateLabel, "Indicative 7.25%");

  let unmatchedCalls = 0;
  const unmatched = await resolveAnswerSaveLenderSelection({
    snapshot,
    submitted: {
      selectedLenderRef: "lender-unknown",
      selectedLenderName: "Unknown Lender",
      selectedProgrammeRef: "programme-unknown",
    },
    loadEligible: async () => {
      unmatchedCalls += 1;
      return [published];
    },
  });
  assert.equal(unmatchedCalls, 1);
  assert.deepEqual(unmatched, [stored]);

  let repeatedCalls = 0;
  for (let index = 0; index < 5; index += 1) {
    const again = await resolveAnswerSaveLenderSelection({
      snapshot,
      submitted: homeLoanAnswers,
      loadEligible: async () => {
        repeatedCalls += 1;
        return [published];
      },
    });
    assert.deepEqual(again, [stored]);
  }
  assert.equal(repeatedCalls, 0);

  let failedCalls = 0;
  const failed = await resolveAnswerSaveLenderSelection({
    snapshot,
    submitted: explicitSingle(published),
    loadEligible: async () => {
      failedCalls += 1;
      throw new Error("catalogue unavailable");
    },
  });
  assert.equal(failedCalls, 1);
  assert.deepEqual(failed, [stored]);

  const retried = await resolveAnswerSaveLenderSelection({
    snapshot,
    submitted: explicitSingle(published),
    loadEligible: async () => [published],
  });
  assert.equal(retried[0]?.lenderRef, "lender-published");

  const before = await measure(
    "before",
    async (load) => {
      await load();
      await load();
    },
    { delayMs: 40 },
  );
  const after = await measure(
    "after",
    async (load) => {
      await resolveAnswerSaveLenderSelection({ snapshot, submitted: homeLoanAnswers, loadEligible: load });
      await resolveAnswerSaveLenderSelection({ snapshot, submitted: balanceTransferAnswers, loadEligible: load });
    },
    { delayMs: 40 },
  );
  assert.equal(before.calls, 2);
  assert.equal(after.calls, 0);
  assert.ok(after.elapsedMs < before.elapsedMs);

  const source = readFileSync(
    new URL("../server/services/compass-customer-gateway/compass-journey.service.ts", import.meta.url),
    "utf8",
  );
  const patchStart = source.indexOf("async patchAnswers");
  const analyzeStart = source.indexOf("async analyze");
  const lodStart = source.indexOf("async getLod");
  const patchBody = source.slice(patchStart, analyzeStart);
  const analyzeBody = source.slice(analyzeStart, lodStart);
  assert.equal((patchBody.match(/loadRegistryRecommendationCards/g) ?? []).length, 1);
  assert.match(patchBody, /resolveAnswerSaveLenderSelection/);
  assert.match(patchBody, /updateOpportunity/);
  assert.equal((analyzeBody.match(/loadRegistryRecommendationCards/g) ?? []).length, 1);
  assert.match(analyzeBody, /computeCompassAdvantage/);
  assert.match(analyzeBody, /persistCompassAdvantageCommitment/);
  assert.equal((source.match(/async analyze/g) ?? []).length, 1);

  console.log(JSON.stringify({
    ordinaryCatalogueCalls: 0,
    explicitCatalogueCalls: explicitCalls,
    repeatedOrdinaryCatalogueCalls: repeatedCalls,
    failedExplicitCatalogueCalls: failedCalls,
    analysisFunctions: 1,
    databaseWritesInSelection: 0,
    before,
    after,
    storedSelectionPreserved: true,
    minimumRoiLabelPreserved: selected[0]?.interestRateLabel,
  }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
