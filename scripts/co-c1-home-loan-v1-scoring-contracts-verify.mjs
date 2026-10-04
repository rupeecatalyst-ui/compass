import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const { runHomeLoanV1ScoringContractsProof } = await import("../src/lib/product-recommendation/home-loan-v1-scoring-contracts-proof.ts");
await runHomeLoanV1ScoringContractsProof();
assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
