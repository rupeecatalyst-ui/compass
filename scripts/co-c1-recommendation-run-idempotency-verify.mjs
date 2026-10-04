import assert from "node:assert/strict";

if (process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_FORBIDDEN");
}

let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, {
  get() {
    databaseAttempts += 1;
    throw new Error("DATABASE_FORBIDDEN");
  },
});

const { runRecommendationRunIdempotencyProof } = await import(
  "../src/lib/opportunity-assessment/recommendation-run-idempotency-proof.ts"
);
await runRecommendationRunIdempotencyProof();
assert.equal(databaseAttempts, 0);
console.log("recommendation-run-idempotency: PASS");
