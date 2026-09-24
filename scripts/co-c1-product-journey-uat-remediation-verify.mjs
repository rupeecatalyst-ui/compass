import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });

const { runProductJourneyUatRemediationProof } = await import("../src/lib/product-journey/uat-remediation-proof.ts");
const { runHomeLoanMatchPercentProof } = await import("../src/lib/product-recommendation/home-loan-match-percent-proof.ts");

await runProductJourneyUatRemediationProof();
await runHomeLoanMatchPercentProof();

assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
console.log("CO_C1_PRODUCT_JOURNEY_UAT_REMEDIATION_VERIFY: PASS");
