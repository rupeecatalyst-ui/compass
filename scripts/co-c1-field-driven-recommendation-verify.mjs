import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const { runFieldDrivenRecommendationProof } = await import("../src/lib/product-recommendation/field-driven-proof.ts");
await runFieldDrivenRecommendationProof();
assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
