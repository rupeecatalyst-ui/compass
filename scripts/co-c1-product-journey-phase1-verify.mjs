import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const { runProductJourneyPhase1Proof } = await import("../src/lib/product-journey/phase1-proof.ts");
await runProductJourneyPhase1Proof();
console.log("DATABASE_ACCESSED:", databaseAttempts > 0 ? "YES" : "NO");
assert.equal(databaseAttempts, 0);
