import assert from "node:assert/strict";

if (process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_FORBIDDEN");
}

const { runChanakyaOpportunityContextLineProof } = await import(
  "../src/lib/chanakya/opportunity-context-line-proof.ts"
);
runChanakyaOpportunityContextLineProof();
assert.equal(process.env.DATABASE_URL ?? "", "");
