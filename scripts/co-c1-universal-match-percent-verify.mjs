import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const { runUniversalMatchPercentPhase1Proof } = await import("../src/lib/product-recommendation/phase1-proof.ts");
await runUniversalMatchPercentPhase1Proof();
assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
