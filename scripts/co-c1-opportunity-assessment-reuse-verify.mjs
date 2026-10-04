import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

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

const { runOpportunityAssessmentReuseProof } = await import(
  "../src/lib/opportunity-assessment/reuse-opportunity-facts-proof.ts"
);
await runOpportunityAssessmentReuseProof();
assert.equal(databaseAttempts, 0);
console.log(`OPPORTUNITY_ASSESSMENT_REUSE_PROOF complete. cwd=${fileURLToPath(new URL("..", import.meta.url))}`);
