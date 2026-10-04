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

const { runPanIndiaEligibilityProof } = await import(
  "../src/lib/opportunity-assessment/pan-india-eligibility-proof.ts"
);
runPanIndiaEligibilityProof();
assert.equal(databaseAttempts, 0);
console.log("pan-india-eligibility: PASS");
