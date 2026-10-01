import assert from "node:assert/strict";

if (process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_FORBIDDEN");
}

let databaseAttempts = 0;
globalThis.prisma = new Proxy(
  {},
  {
    get() {
      databaseAttempts += 1;
      throw new Error("DATABASE_FORBIDDEN");
    },
  },
);

const { runPersistedAssessmentInspectionRouteProof } = await import(
  "../src/lib/opportunity-assessment/persisted-assessment-inspection-route-proof.ts"
);
await runPersistedAssessmentInspectionRouteProof();
assert.equal(databaseAttempts, 0);
