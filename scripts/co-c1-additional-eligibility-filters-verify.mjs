import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });

const { runAdditionalEligibilityFilterProof } = await import("../src/lib/product-programme-operations/additional-eligibility-filters/proof.ts");
const { runHomeLoanMatchPercentProof } = await import("../src/lib/product-recommendation/home-loan-match-percent-proof.ts");

await runAdditionalEligibilityFilterProof();
await runHomeLoanMatchPercentProof();

assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
console.log("CO_C1_ADDITIONAL_ELIGIBILITY_FILTERS_VERIFY: PASS");
