import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const { runMatchPercentWeightLineageProof } = await import("../src/lib/product-recommendation/weight-lineage-proof.ts");
await runMatchPercentWeightLineageProof();
console.log("DATABASE_ACCESSED:", databaseAttempts > 0 ? "YES" : "NO");
assert.equal(databaseAttempts, 0);
console.log("CO_C1_MATCH_PERCENT_WEIGHT_LINEAGE_VERIFY: PASS");
