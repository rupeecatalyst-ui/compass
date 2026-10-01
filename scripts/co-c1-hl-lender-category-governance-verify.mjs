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

const { runLenderCategoryGovernanceProof } = await import(
  "../src/lib/home-loan-recommendation/lender-category-governance-proof.ts"
);
runLenderCategoryGovernanceProof();
assert.equal(databaseAttempts, 0);
assert.equal(process.env.DATABASE_URL ?? "", "");
