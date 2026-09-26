import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const { runProductJourneyLineageProof } = await import("../src/lib/product-journey/lineage-proof.ts");
await runProductJourneyLineageProof();
console.log("DATABASE_ACCESSED:", databaseAttempts > 0 ? "YES" : "NO");
assert.equal(databaseAttempts, 0);
console.log("CO_C1_PRODUCT_JOURNEY_LINEAGE_VERIFY: PASS");
